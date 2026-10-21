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

  // 1. Detectar tipo de petición
  const esAdmin = req.url.includes('/api/admin/');

  // 2. Elegir token correcto
  const token = esAdmin ? adminAuth.getToken() : auth.obtenerToken();

  // 3. Endpoints públicos
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

  // 4. Clonar request con token
  let cloned = req;

  if (token && !esPublico) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // 5. Manejar errores
  return next(cloned).pipe(
    catchError((error) => {

      // CASO A: Token de ADMIN expirado
      if (error.status === 401 && esAdmin && !esPublico && token) {
        console.warn('[INTERCEPTOR] Sesión admin expirada');
        adminAuth.logout();
        return throwError(() => error);
      }

      // CASO B: Token de USUARIO expirado
      if (error.status === 401 && !esAdmin && !esPublico && token) {
        console.warn('[INTERCEPTOR] Sesión de usuario expirada');

        const estaEnPanelAdmin = estaEnRutaAdmin();

        if (estaEnPanelAdmin) {
          console.warn('[INTERCEPTOR] En ruta admin, no se desloguea al usuario normal');
          return throwError(() => error);
        }

        if (adminAuth.estaLogueado()) {
          console.warn('[INTERCEPTOR] Hay sesión admin activa, no se desloguea al usuario');
          return throwError(() => error);
        }

        console.warn('[INTERCEPTOR] Deslogueando usuario normal');
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};

function estaEnRutaAdmin(): boolean {
  try {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    return hash.includes('/admin/') || path.includes('/admin/');
  } catch {
    return false;
  }
}