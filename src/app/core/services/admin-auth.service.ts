// src/app/core/services/admin-auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: number;
  email: string;
  nombre: string;
  rol: 'CEO' | 'ADMIN' | 'MODERADOR';
}

export interface AdminLoginResponse {
  token: string;
  admin: AdminUser;
  expiresIn: number;
}

@Injectable({ providedIn: 'root' })
export class AdminAuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API = `${environment.apiUrl}/admin/auth`;
  private readonly TOKEN_KEY = 'kiert_admin_token';
  private readonly ADMIN_KEY = 'kiert_admin_data';

  // Señales reactivas
  private _admin = signal<AdminUser | null>(this.cargarAdminDesdeStorage());
  private _token = signal<string | null>(this.cargarTokenDesdeStorage());

  // Lecturas públicas
  admin = this._admin.asReadonly();
  token = this._token.asReadonly();

  // ✅ Computed con validación de expiración
  estaLogueado = computed(() => {
    const token = this._token();
    const admin = this._admin();

    if (!token || !admin) return false;

    // Verificar si el JWT expiró
    if (this.tokenExpirado(token)) {
      // Limpia automáticamente si expiró
      this.limpiarStorage();
      return false;
    }

    return true;
  });

  esCEO = computed(() => this._admin()?.rol === 'CEO');

  esAdminOMayor = computed(() => {
    const rol = this._admin()?.rol;
    return rol === 'CEO' || rol === 'ADMIN';
  });

  // ============================================================
  // LOGIN
  // ============================================================
  login(email: string, password: string): Observable<AdminLoginResponse> {
    return this.http.post<AdminLoginResponse>(`${this.API}/login`, { email, password })
      .pipe(
        tap((res) => {
          this._token.set(res.token);
          this._admin.set(res.admin);
          localStorage.setItem(this.TOKEN_KEY, res.token);
          localStorage.setItem(this.ADMIN_KEY, JSON.stringify(res.admin));
        }),
        catchError((err) => throwError(() => err))
      );
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  /**
   * ✅ Cierra sesión SIN navegar.
   * Úsalo cuando tú controlas la redirección (ej. navbar).
   */
  logout(): void {
    this._token.set(null);
    this._admin.set(null);
    this.limpiarStorage();
    // ⚠️ NO navega aquí
  }

  /**
   * ✅ Cierra sesión Y navega a /admin/login.
   * Úsalo desde el propio panel admin.
   */
  logoutYNavegar(): void {
    this.logout();
    this.router.navigate(['/admin/login']);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  getToken(): string | null {
    return this._token();
  }

  /**
   * ✅ Limpia el localStorage.
   */
  private limpiarStorage(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ADMIN_KEY);
    } catch {
      // sin problema
    }
  }

  /**
   * ✅ Verifica si un JWT expiró (sin librerías externas).
   */
  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const expiracion = payload.exp * 1000; // a milisegundos
      return Date.now() >= expiracion;
    } catch {
      // si no se puede parsear → considerar expirado
      return true;
    }
  }

  private cargarTokenDesdeStorage(): string | null {
    try {
      return localStorage.getItem(this.TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private cargarAdminDesdeStorage(): AdminUser | null {
    try {
      const raw = localStorage.getItem(this.ADMIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}