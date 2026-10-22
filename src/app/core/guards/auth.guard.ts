// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  // ✅ Esperar a que AuthService termine de leer de sessionStorage
  //    (evita el parpadeo "Sin sesión → login")
  await auth.whenReady();

  const hayUsuario = auth.isAuthenticated();
  const hayAdmin = adminAuth.estaLogueado();

  if (hayUsuario || hayAdmin) {
    return true;
  }

  console.warn('[AUTH GUARD] Sin sesión, redirigiendo a login');
  router.navigate(['/login'], {
    queryParams: { redirect: state.url }
  });
  return false;
};