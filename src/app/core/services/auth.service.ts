// auth.service.ts -> maneja TODO lo relacionado a sesión: login, registro,
// recuperar contraseña, logout y saber "quién soy ahora mismo".
// Es un @Injectable con providedIn: 'root' => Angular crea UNA sola instancia
// compartida por toda la app (patrón singleton), sin tener que registrarlo en ningún módulo.
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../models/user.model';

const TOKEN_KEY = 'kiert_token';
const USER_KEY = 'kiert_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // signal(): estado reactivo de Angular. Cualquier componente que lo lea
  // en su template se actualiza solo cuando este valor cambia (sin subscribe manual).
  private usuarioActual = signal<User | null>(this.leerUsuarioGuardado());

  // computed(): valor derivado de otro signal. Aquí exponemos un booleano
  // simple de "hay sesión sí/no" para usarlo en el navbar y en el guard.
  estaLogueado = computed(() => this.usuarioActual() !== null);
  usuario = this.usuarioActual.asReadonly(); // versión de solo lectura para el resto de la app

  constructor(private http: HttpClient, private router: Router) {}

  // --- LOGIN ---
  // Llama a POST /api/auth/login del backend Spring Boot.
  // El backend valida el hash de la contraseña (BCrypt) y responde con un JWT.
  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, datos).pipe(
      tap((res) => this.guardarSesion(res)) // al recibir respuesta OK, guardamos token+usuario
    );
  }

  // --- REGISTRO ---
  registro(datos: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/registro`, datos).pipe(
      tap((res) => this.guardarSesion(res))
    );
  }

  // --- RECUPERAR CONTRASEÑA (paso 1: pedir el correo) ---
  // El backend genera un token temporal y envía un correo con el link de reseteo.
  solicitarRecuperacion(email: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/auth/recuperar-contrasena`, { email });
  }

  // --- RECUPERAR CONTRASEÑA (paso 2: definir la nueva, usando el token del correo) ---
  restablecerContrasena(token: string, nuevaContrasena: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/auth/restablecer-contrasena`, {
      token,
      nuevaContrasena,
    });
  }

  // --- LOGOUT ---
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuarioActual.set(null);
    this.router.navigate(['/login']);
  }

  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Guarda el JWT y los datos del usuario en localStorage para persistir
  // la sesión aunque se recargue la página o se cierre el navegador.
  private guardarSesion(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    this.usuarioActual.set(res.usuario);
  }

  private leerUsuarioGuardado(): User | null {
    const guardado = localStorage.getItem(USER_KEY);
    return guardado ? JSON.parse(guardado) : null;
  }
}
