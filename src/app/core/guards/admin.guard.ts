// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  // Verifica si hay sesión de ADMIN
  if (!adminAuth.estaLogueado()) {
    router.navigate(['/admin/login'], {
      queryParams: { redirect: state.url }
    });
    return false;
  }

  // Verifica rol si la ruta lo requiere
  const rolesRequeridos = route.data?.['roles'] as string[] | undefined;
  if (rolesRequeridos && rolesRequeridos.length > 0) {
    const rolActual = adminAuth.admin()?.rol;
    if (!rolActual || !rolesRequeridos.includes(rolActual)) {
      router.navigate(['/admin/login']);
      return false;
    }
  }

  return true;
};