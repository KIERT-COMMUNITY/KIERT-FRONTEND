// auth.service.ts
import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly USER_KEY = 'usuario_actual';
 private readonly TOKEN_KEY = 'token';

  usuario: WritableSignal<User | null> = signal<User | null>(null);
  token: WritableSignal<string | null> = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.cargarSesion();
  }

  private cargarSesion(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const usuarioStr = localStorage.getItem(this.USER_KEY);
    
    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        this.token.set(token);
        this.usuario.set(usuario);
      } catch (e) {
        this.limpiarSesion();
      }
    }
  }

  login(credenciales: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        if (respuesta.token && respuesta.usuario) {
          this.guardarSesion(respuesta.token, respuesta.usuario);
        }
      })
    );
  }

  registro(datos: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/registro`, datos).pipe(
      tap((respuesta) => {
        if (respuesta.token && respuesta.usuario) {
          this.guardarSesion(respuesta.token, respuesta.usuario);
        }
      })
    );
  }

  obtenerPerfil(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/perfil`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  // ✅ MÉTODO PARA SUBIR FOTO DIRECTAMENTE (multipart)
  subirFotoMultipart(archivo: File): Observable<User> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    return this.http.post<User>(`${this.API_URL}/perfil/foto`, formData).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  // ✅ MÉTODO PARA ACTUALIZAR CON URL (para compatibilidad)
  actualizarFotoPerfil(urlFoto: string): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil/foto-url`, { urlFoto }).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  actualizarPerfil(datos: { nombreUsuario?: string; email?: string }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil`, datos).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

solicitarRecuperacion(email: string): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/recuperar`, { email });
}

restablecerContrasena(token: string, password: string): Observable<any> {
  return this.http.post(`${this.API_URL}/auth/restablecer`, { token, password });
}

  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  private guardarSesion(token: string, usuario: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
    this.token.set(token);
    this.usuario.set(usuario);
  }

  private limpiarSesion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.usuario.set(null);
  }

  isAuthenticated(): boolean {
    return !!this.token() && !!this.usuario();
  }

  estaLogueado(): boolean {
    return this.isAuthenticated();
  }

  obtenerToken(): string | null {
    return this.token();
  }

  getToken(): string | null {
    return this.token();
  }

  getUser(): User | null {
    return this.usuario();
  }
}