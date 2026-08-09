// auth.interceptor.ts -> se ejecuta en TODA petición HTTP saliente.
// Su trabajo: si hay un token guardado, lo agrega en la cabecera "Authorization"
// para que el backend sepa quién hace la petición (sin tener que repetirlo
// manualmente en cada servicio que llama a la API).
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.obtenerToken();

  if (!token) {
    return next(req); // no hay sesión: la petición sigue igual (ej: login, registro)
  }

  // clone(): las peticiones HTTP en Angular son inmutables, por eso se
  // clona la petición original agregándole el header Authorization
  const reqConToken = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(reqConToken);
};
