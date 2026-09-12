import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const usuario = authService.usuario();

  // Verificar si está logueado
  if (!usuario) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ Si tienes un campo 'rol' en el usuario:
  // if (usuario.rol !== 'ADMIN') {
  //   router.navigate(['/comunidad']);
  //   return false;
  // }

  // ⚠️ TEMPORAL: permitir cualquier usuario logueado
  // (quitar esto cuando agregues roles reales)
  return true;
};