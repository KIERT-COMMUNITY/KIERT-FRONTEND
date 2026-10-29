// src/app/core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl.replace(/\/$/, '');

function esUrlDeLaApi(url: string): boolean {
  return url.startsWith(API_BASE + '/') || url === API_BASE;
}

function esRutaAdmin(url: string): boolean {
  return esUrlDeLaApi(url) && url.startsWith(API_BASE + '/admin/');
}

function esRutaPresencia(url: string): boolean {
  return esUrlDeLaApi(url) && url.startsWith(API_BASE + '/presencia/');
}

const RUTAS_PUBLICAS = [
  '/auth/login',
  '/auth/registro',
  '/auth/verificar-cuenta',
  '/auth/reenviar-codigo',
  '/auth/recuperar',
  '/auth/reset-password',
  '/admin/auth/login',
  '/grupos/invitacion/'
];

function esRutaPublica(url: string): boolean {
  if (!esUrlDeLaApi(url)) return true; // no tocar peticiones a terceros
  return RUTAS_PUBLICAS.some(r => url.startsWith(API_BASE + r));
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);

  // No inyectar tokens en peticiones a dominios externos
  if (!esUrlDeLaApi(req.url)) {
    return next(req);
  }

  if (esRutaPublica(req.url)) {
    return next(req);
  }

  const rutaAdmin = esRutaAdmin(req.url);
  const rutaPresencia = esRutaPresencia(req.url);

  let token: string | null = null;

  if (rutaAdmin) {
    token = adminAuth.getToken();
  } else if (rutaPresencia) {
    token = auth.obtenerTokenUsuario();
  } else {
    token = adminAuth.getToken() ?? auth.obtenerToken();
  }

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((error) => {
      if (error.status === 401 && token && !rutaPresencia) {
        if (rutaAdmin) {
          adminAuth.logout();
        } else if (adminAuth.estaLogueado()) {
          adminAuth.logout();
        } else {
          auth.logout();
        }
      }
      return throwError(() => error);
    })
  );
};