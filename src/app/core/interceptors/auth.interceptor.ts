// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  // ============================================================
  // 1. Endpoints públicos (no requieren token)
  // ============================================================
  const esPublico =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/registro') ||
    req.url.includes('/auth/verificar-cuenta') ||
    req.url.includes('/auth/reenviar-codigo') ||
    req.url.includes('/auth/recuperar') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/admin/auth/login') ||
    req.url.includes('/presencia/') ||
    req.url.includes('/grupos/invitacion/');

  if (esPublico) {
    return next(req);
  }

  // ============================================================
  // 2. Elegir token:
  //    - Si es /api/admin/* → SIEMPRE admin
  //    - Si es cualquier otra ruta → admin si está logueado, si no usuario
  // ============================================================
  const esRutaAdminExplicita = req.url.includes('/api/admin/');

  let token: string | null = null;

  if (esRutaAdminExplicita) {
    token = adminAuth.getToken();
  } else {
    // ✅ Admin logueado tiene prioridad en TODA la app
    if (adminAuth.estaLogueado()) {
      token = adminAuth.getToken();
    }
    // Si no hay admin, usar el token del usuario normal
    if (!token) {
      token = auth.obtenerToken();
    }
  }

  // ============================================================
  // 3. Clonar con Authorization
  // ============================================================
  let cloned = req;
  if (token) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // ============================================================
  // 4. Manejo de 401
  // ============================================================
  return next(cloned).pipe(
    catchError((error) => {
      if (error.status === 401 && token) {
        if (esRutaAdminExplicita) {
          console.warn('[INTERCEPTOR] Sesión admin expirada');
          adminAuth.logout();
        } else if (adminAuth.estaLogueado()) {
          console.warn('[INTERCEPTOR] Token admin inválido en ruta de usuario');
          adminAuth.logout();
        } else {
          console.warn('[INTERCEPTOR] Sesión de usuario expirada');
          auth.logout();
        }
      }
      return throwError(() => error);
    })
  );
};