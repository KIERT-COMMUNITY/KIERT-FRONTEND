// src/app/core/services/auth.service.ts
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly USER_KEY = 'usuario_actual';
  private readonly TOKEN_KEY = 'token';

  usuario: WritableSignal<User | null> = signal<User | null>(null);
  token: WritableSignal<string | null> = signal<string | null>(null);

  private readonly sesionCambiadaSubject = new Subject<boolean>();
  readonly sesionCambiada$ = this.sesionCambiadaSubject.asObservable();

  private http = inject(HttpClient);
  private router = inject(Router);

  constructor() {
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
        queueMicrotask(() => this.sesionCambiadaSubject.next(true));
      } catch {
        this.limpiarSesion();
      }
    }
  }

  private guardarSesion(token: string, usuario: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
    this.token.set(token);
    this.usuario.set(usuario);
    this.sesionCambiadaSubject.next(true);
  }

  private limpiarSesion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.usuario.set(null);
    this.sesionCambiadaSubject.next(false);
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

  registro(datos: RegisterRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/registro`, datos);
  }

  verificarCuenta(email: string, codigo: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/verificar-cuenta`, { email, codigo });
  }

  reenviarCodigoVerificacion(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reenviar-codigo`, { email });
  }

  solicitarRecuperacion(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/recuperar`, { email });
  }

  resetPasswordConCodigo(email: string, codigo: string, nuevaPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, {
      email, codigo, nuevaPassword
    });
  }

  obtenerPerfil(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/perfil`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

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

  actualizarFotoPerfil(urlFoto: string): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil/foto-url`, { urlFoto }).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  eliminarFotoPerfil(): Observable<User> {
    return this.http.delete<User>(`${this.API_URL}/perfil/foto`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  // ✅ AÑADIDO EL CAMPO BIO AL TIPADO
  actualizarPerfil(datos: { nombreUsuario?: string; email?: string; bio?: string }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil`, datos).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  logout(): void {
    const token = this.token();
    this.limpiarSesion();

    if (token) {
      this.http.post(`${this.API_URL}/auth/logout`, {}).subscribe({
        next: () => this.finalizarLogout(),
        error: () => this.finalizarLogout()
      });
    } else {
      this.finalizarLogout();
    }
  }

  private finalizarLogout(): void {
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.token();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('[AUTH] Token de usuario expirado');
        this.limpiarSesion();
        return false;
      }
    } catch {
      return false;
    }

    return !!this.usuario();
  }

  estaLogueado(): boolean { return this.isAuthenticated(); }
  obtenerToken(): string | null { return this.token(); }
  getToken(): string | null { return this.token(); }
  getUser(): User | null { return this.usuario(); }
}