// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // ✅ Fallback: verificar localStorage directamente
  const token = localStorage.getItem('token');
  const usuarioStr = localStorage.getItem('usuario_actual');

  if (token && usuarioStr) {
    if (!auth.estaLogueado()) {
      try {
        const usuario = JSON.parse(usuarioStr);
        auth.token.set(token);
        auth.usuario.set(usuario);
      } catch {}
    }
    return true;
  }

  console.warn('🚫 Guard: sin sesión, redirigiendo a login');
  router.navigate(['/login']);
  return false;
};