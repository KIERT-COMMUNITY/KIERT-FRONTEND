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

  const esPublico =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/registro') ||
    req.url.includes('/auth/verificar-cuenta') ||
    req.url.includes('/auth/reenviar-codigo') ||
    req.url.includes('/auth/recuperar') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/admin/auth/login') ||
    req.url.includes('/grupos/invitacion/');

  if (esPublico) {
    return next(req);
  }

  const esRutaAdminExplicita = req.url.includes('/api/admin/');
  const esRutaPresencia = req.url.includes('/api/presencia/');

  let token: string | null = null;

  if (esRutaAdminExplicita) {
    token = adminAuth.getToken();
  } else if (esRutaPresencia) {
    // Presencia usa el token del usuario normal (no admin)
    token = auth.obtenerTokenUsuario();
  } else {
    if (adminAuth.estaLogueado()) {
      token = adminAuth.getToken();
    }
    if (!token) {
      token = auth.obtenerToken();
    }
  }

  let cloned = req;
  if (token) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(cloned).pipe(
    catchError((error) => {
      // NUNCA desloguear por 401 en /presencia/
      if (error.status === 401 && token && !esRutaPresencia) {
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