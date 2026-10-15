// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  // ============================================================
  // 1. Verificar sesión de usuario normal
  // ============================================================
  const tokenUsuario = localStorage.getItem('token');
  const usuarioStr = localStorage.getItem('usuario_actual');
  const tieneSesionUsuario = !!(tokenUsuario && usuarioStr);

  // Si hay token pero el servicio no lo tiene cargado, cargarlo
  if (tieneSesionUsuario && !auth.estaLogueado()) {
    try {
      const usuario = JSON.parse(usuarioStr!);
      auth.token.set(tokenUsuario);
      auth.usuario.set(usuario);
    } catch {
      // ignorar
    }
  }

  // ============================================================
  // 2. Verificar sesión de admin (CEO, ADMIN, MODERADOR)
  // ============================================================
  const tokenAdmin = localStorage.getItem('kiert_admin_token');
  const adminData = localStorage.getItem('kiert_admin_data');
  const tieneSesionAdmin = !!(tokenAdmin && adminData);

  // ============================================================
  // 3. Permitir si tiene CUALQUIER sesión
  // ============================================================
  if (tieneSesionUsuario || tieneSesionAdmin) {
    console.log('[AUTH GUARD] ✅ Acceso permitido', {
      usuario: tieneSesionUsuario,
      admin: tieneSesionAdmin,
      url: state.url
    });
    return true;
  }

  // ============================================================
  // 4. Sin sesiones → redirigir a login
  // ============================================================
  console.warn('[AUTH GUARD] 🚫 Sin sesión, redirigiendo a login', {
    url: state.url
  });

  router.navigate(['/login'], {
    queryParams: { redirect: state.url }
  });

  return false;
};