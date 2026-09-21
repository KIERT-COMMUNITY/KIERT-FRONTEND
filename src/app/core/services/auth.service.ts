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
    this.setupBeforeUnloadListener();
  }

  // ============================================================
  // SESION
  // ============================================================
  private cargarSesion(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const usuarioStr = localStorage.getItem(this.USER_KEY);

    if (token && usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        this.token.set(token);
        this.usuario.set(usuario);
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
  }

  private limpiarSesion(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.usuario.set(null);
  }

  // ============================================================
  // LOGIN
  // ============================================================
  login(credenciales: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        if (respuesta.token && respuesta.usuario) {
          this.guardarSesion(respuesta.token, respuesta.usuario);
        }
      })
    );
  }

  // ============================================================
  // REGISTRO (NO guarda sesion porque requiere verificar email)
  // ============================================================
  registro(datos: RegisterRequest): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/registro`, datos);
  }

  // ============================================================
  // VERIFICAR CUENTA CON CODIGO
  // ============================================================
  verificarCuenta(email: string, codigo: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/verificar-cuenta`, { email, codigo });
  }

  // ============================================================
  // REENVIAR CODIGO DE VERIFICACION
  // ============================================================
  reenviarCodigoVerificacion(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reenviar-codigo`, { email });
  }

  // ============================================================
  // SOLICITAR RECUPERACION (envia codigo)
  // ============================================================
  solicitarRecuperacion(email: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/recuperar`, { email });
  }

  // ============================================================
  // RESET PASSWORD CON CODIGO
  // ============================================================
  resetPasswordConCodigo(email: string, codigo: string, nuevaPassword: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, {
      email,
      codigo,
      nuevaPassword
    });
  }

  // ============================================================
  // PERFIL
  // ============================================================
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

  actualizarPerfil(datos: { nombreUsuario?: string; email?: string }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil`, datos).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  logout(): void {
    const token = this.token();

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
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  // ============================================================
  // BEFORE UNLOAD
  // ============================================================
  private setupBeforeUnloadListener(): void {
    window.addEventListener('beforeunload', () => {
      const usuario = this.usuario();
      if (usuario?.id) {
        const url = `${this.API_URL}/auth/logout-beacon?usuarioId=${usuario.id}`;
        navigator.sendBeacon(url);
      }
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
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