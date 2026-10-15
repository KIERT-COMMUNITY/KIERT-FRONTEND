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
  // 1. DETECTAR TIPO DE PETICIÓN
  // ============================================================
  const esAdmin = req.url.includes('/api/admin/');

  // ============================================================
  // 2. ELEGIR TOKEN CORRECTO
  // ============================================================
  const token = esAdmin ? adminAuth.getToken() : auth.obtenerToken();

  // ============================================================
  // 3. ENDPOINTS PÚBLICOS (no requieren token)
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

  // ============================================================
  // 4. CLONAR REQUEST CON TOKEN
  // ============================================================
  let cloned = req;

  if (token && !esPublico) {
    cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  // ============================================================
  // 5. MANEJAR ERRORES
  // ============================================================
  return next(cloned).pipe(
    catchError((error) => {

      // --------------------------------------------------------
      // CASO A: Token de ADMIN expirado
      // --------------------------------------------------------
      if (error.status === 401 && esAdmin && !esPublico && token) {
        console.warn('[INTERCEPTOR] Sesión admin expirada');
        adminAuth.logout();
        // ⚠️ NO navegamos aquí — el guard se encarga
        return throwError(() => error);
      }

      // --------------------------------------------------------
      // CASO B: Token de USUARIO expirado
      // --------------------------------------------------------
      if (error.status === 401 && !esAdmin && !esPublico && token) {
        console.warn('[INTERCEPTOR] Sesión de usuario expirada');

        // ✅ NUEVO: Verificar si estamos navegando dentro de /admin/
        //    Si sí, NO desloguear (el CEO sigue con su sesión admin)
        const estaEnPanelAdmin = estaEnRutaAdmin();

        if (estaEnPanelAdmin) {
          console.warn('[INTERCEPTOR] En ruta admin, no se desloguea al usuario normal');
          return throwError(() => error);
        }

        // ✅ También verificar si hay sesión admin activa
        //    Si el CEO está logueado como admin, no desloguear el usuario
        if (adminAuth.estaLogueado()) {
          console.warn('[INTERCEPTOR] Hay sesión admin activa, no se desloguea al usuario');
          return throwError(() => error);
        }

        // Si no está en admin y no hay sesión admin → sí desloguear
        console.warn('[INTERCEPTOR] Deslogueando usuario normal');
        auth.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};

// ============================================================
// HELPER: ¿estamos en una ruta de admin?
// ============================================================
function estaEnRutaAdmin(): boolean {
  try {
    const hash = window.location.hash || '';
    const path = window.location.pathname || '';
    return hash.includes('/admin/') || path.includes('/admin/');
  } catch {
    return false;
  }
}