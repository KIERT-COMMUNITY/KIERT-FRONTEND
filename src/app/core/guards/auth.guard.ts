// auth.guard.ts -> "portero" de las rutas privadas.
// Angular ejecuta esta función ANTES de entrar a cualquier ruta que tenga
// canActivate: [authGuard] (ver app.routes.ts). Si no hay sesión, redirige a /login.
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService); // inject() permite pedir dependencias fuera de un constructor
  const router = inject(Router);

  if (auth.estaLogueado()) {
    return true; // deja pasar
  }

  router.navigate(['/login']);
  return false; // bloquea el acceso a la ruta
};
