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

  // ✅ Computed con validación de expiración y rol
  estaLogueado = computed(() => {
    const token = this._token();
    const admin = this._admin();

    if (!token || !admin) return false;

    // Verificar si el JWT expiró
    if (this.tokenExpirado(token)) {
      this.limpiarStorage();
      return false;
    }

    // Validar que el rol sea correcto
    if (!['CEO', 'ADMIN', 'MODERADOR'].includes(admin.rol)) {
      this.limpiarStorage();
      return false;
    }

    return true;
  });

  esCEO = computed(() => this.estaLogueado() && this._admin()?.rol === 'CEO');

  esAdminOMayor = computed(() => {
    if (!this.estaLogueado()) return false;
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
          if (!res.token || !res.admin) {
            throw new Error('Respuesta de login inválida');
          }
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
   * Cierra sesión SIN navegar. Limpia las señales y el localStorage.
   */
  logout(): void {
    this._token.set(null);
    this._admin.set(null);
    this.limpiarStorage();
  }

  /**
   * Cierra sesión Y navega a /admin/login.
   */
  logoutYNavegar(): void {
    this.logout();
    this.router.navigate(['/admin/login']);
  }

  // ============================================================
  // HELPERS DE SEGURIDAD
  // ============================================================
  getToken(): string | null {
    return this._token();
  }

  /**
   * Limpia el localStorage y fuerza un estado nulo.
   */
  private limpiarStorage(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.ADMIN_KEY);
    } catch {
      // Ignorar errores de almacenamiento
    }
    // Forzar nulo para evitar bugs en memoria
    this._token.set(null);
    this._admin.set(null);
  }

  /**
   * Verifica si un JWT expiró sin librerías externas.
   */
  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const expiracion = payload.exp * 1000; // a milisegundos
      return Date.now() >= expiracion;
    } catch {
      return true; // Si no se puede parsear, se considera expirado
    }
  }

  private cargarTokenDesdeStorage(): string | null {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (token && this.tokenExpirado(token)) {
        localStorage.removeItem(this.TOKEN_KEY);
        return null;
      }
      return token;
    } catch {
      return null;
    }
  }

  private cargarAdminDesdeStorage(): AdminUser | null {
    try {
      const raw = localStorage.getItem(this.ADMIN_KEY);
      if (!raw) return null;
      const admin: AdminUser = JSON.parse(raw);
      if (!admin || !admin.id || !admin.rol) return null;
      return admin;
    } catch {
      return null;
    }
  }
}