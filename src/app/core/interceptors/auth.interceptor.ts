// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.obtenerToken();

  // ✅ Endpoints que NO requieren token
  const esPublico =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/registro') ||
    req.url.includes('/auth/verificar-cuenta') ||
    req.url.includes('/auth/reenviar-codigo') ||
    req.url.includes('/auth/recuperar') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/presencia/') ||
    req.url.includes('/grupos/invitacion/');

  let cloned = req;

  if (token && !esPublico) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(cloned).pipe(
    catchError((error) => {
      // ✅ Solo desloguear si:
      //   - es 401
      //   - NO es endpoint público
      //   - YA teníamos un token (la sesión existía antes)
      if (error.status === 401 && !esPublico && token) {
        console.warn('🚪 Sesión expirada, redirigiendo a login');
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};