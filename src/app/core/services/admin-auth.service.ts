// src/app/core/services/admin-auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

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
  private authService = inject(AuthService);
  private storage = inject(StorageService);

  private readonly API = `${environment.apiUrl}/admin/auth`;
  private readonly TOKEN_KEY = 'kiert_admin_token';
  private readonly ADMIN_KEY = 'kiert_admin_data';

  private _admin = signal<AdminUser | null>(this.cargarAdminDesdeStorage());
  private _token = signal<string | null>(this.cargarTokenDesdeStorage());

  admin = this._admin.asReadonly();
  token = this._token.asReadonly();

  estaLogueado = computed(() => {
    const token = this._token();
    const admin = this._admin();
    if (!token || !admin) return false;
    if (this.tokenExpirado(token)) {
      this.limpiarStorage();
      return false;
    }
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
          this.storage.setItem(this.TOKEN_KEY, res.token);
          this.storage.setItem(this.ADMIN_KEY, JSON.stringify(res.admin));

          // Sincronizar AuthService para que getToken() use el admin token
          this.authService.cargarSesionPublica();
        }),
        catchError((err) => throwError(() => err))
      );
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  logout(): void {
    this._token.set(null);
    this._admin.set(null);
    this.limpiarStorage();
    // Limpiar también la sesión normal de esta pestaña
    this.authService.limpiarSesionPublica();
  }

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

  private limpiarStorage(): void {
    this.storage.removeItem(this.TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_KEY);
    this._token.set(null);
    this._admin.set(null);
  }

  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private cargarTokenDesdeStorage(): string | null {
    const token = this.storage.getItem(this.TOKEN_KEY);
    if (token && this.tokenExpirado(token)) {
      this.storage.removeItem(this.TOKEN_KEY);
      return null;
    }
    return token;
  }

  private cargarAdminDesdeStorage(): AdminUser | null {
    const raw = this.storage.getItem(this.ADMIN_KEY);
    if (!raw) return null;
    try {
      const admin: AdminUser = JSON.parse(raw);
      if (!admin || !admin.id || !admin.rol) return null;
      return admin;
    } catch {
      return null;
    }
  }
}