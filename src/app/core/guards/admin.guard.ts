// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  await auth.whenReady();

  if (!adminAuth.estaLogueado()) {
    router.navigate(['/admin/login'], {
      queryParams: { redirect: state.url }
    });
    return false;
  }

  const roles = route.data?.['roles'] as string[] | undefined;
  if (roles && roles.length > 0) {
    const rol = adminAuth.admin()?.rol;
    if (!rol || !roles.includes(rol)) {
      router.navigate(['/admin/login']);
      return false;
    }
  }

  return true;
};