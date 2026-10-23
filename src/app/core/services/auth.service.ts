// src/app/core/services/auth.service.ts
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly USER_KEY = 'usuario_actual';
  private readonly TOKEN_KEY = 'token';
  private readonly ADMIN_TOKEN_KEY = 'kiert_admin_token';
  private readonly ADMIN_DATA_KEY = 'kiert_admin_data';

  usuario: WritableSignal<User | null> = signal<User | null>(null);
  token: WritableSignal<string | null> = signal<string | null>(null);

  private readonly sesionCambiadaSubject = new Subject<boolean>();
  readonly sesionCambiada$ = this.sesionCambiadaSubject.asObservable();

  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(StorageService);

  private _ready: Promise<void>;
  private _readyResolver!: () => void;
  private _readyResolved = false;

  constructor() {
    this._ready = new Promise<void>((resolve) => {
      this._readyResolver = resolve;
    });
    this.cargarSesion();
  }

  public async whenReady(): Promise<void> {
    return this._ready;
  }

  private marcarReady(): void {
    if (!this._readyResolved) {
      this._readyResolved = true;
      this._readyResolver();
    }
  }

  private cargarSesion(): void {
    try {
      const adminToken = this.storage.getItem(this.ADMIN_TOKEN_KEY);
      const adminData = this.storage.getItem(this.ADMIN_DATA_KEY);

      if (adminToken && adminData && !this.tokenExpirado(adminToken)) {
        try {
          const admin = JSON.parse(adminData);
          this.token.set(adminToken);
          const adminUser = {
            id: admin.id,
            email: admin.email,
            nombreUsuario: admin.nombre ?? admin.email,
            rol: admin.rol,
          } as unknown as User;
          this.usuario.set(adminUser);
          queueMicrotask(() => this.sesionCambiadaSubject.next(true));
          return;
        } catch { /* ignore */ }
      }

      const token = this.storage.getItem(this.TOKEN_KEY);
      const usuarioStr = this.storage.getItem(this.USER_KEY);

      if (token && usuarioStr && !this.tokenExpirado(token)) {
        try {
          const usuario = JSON.parse(usuarioStr);
          this.token.set(token);
          this.usuario.set(usuario);
          queueMicrotask(() => this.sesionCambiadaSubject.next(true));
        } catch {
          this.limpiarSesion();
        }
      }
    } finally {
      this.marcarReady();
    }
  }

  // ✅ PRIORIDAD 1: signal en memoria (más fresco, justo tras login)
  // PRIORIDAD 2: storage admin
  // PRIORIDAD 3: storage user
  getToken(): string | null {
    const tokenMemoria = this.token();
    if (tokenMemoria && !this.tokenExpirado(tokenMemoria)) {
      return tokenMemoria;
    }

    const adminToken = this.storage.getItem(this.ADMIN_TOKEN_KEY);
    if (adminToken && !this.tokenExpirado(adminToken)) {
      return adminToken;
    }

    const token = this.storage.getItem(this.TOKEN_KEY);
    if (token && !this.tokenExpirado(token)) {
      return token;
    }

    return null;
  }

  // ✅ NUEVO: Token del usuario NORMAL (ignora admin, para /presencia/*)
  obtenerTokenUsuario(): string | null {
    const tokenMemoria = this.token();
    if (tokenMemoria && !this.tokenExpirado(tokenMemoria)) {
      return tokenMemoria;
    }
    const token = this.storage.getItem(this.TOKEN_KEY);
    if (token && !this.tokenExpirado(token)) {
      return token;
    }
    return null;
  }

  private tokenExpirado(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  }

  private guardarSesion(token: string, usuario: User): void {
    this.storage.setItem(this.TOKEN_KEY, token);
    this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
    this.token.set(token);
    this.usuario.set(usuario);
    this.sesionCambiadaSubject.next(true);
  }

  private limpiarSesion(): void {
    this.storage.removeItem(this.TOKEN_KEY);
    this.storage.removeItem(this.USER_KEY);
    this.storage.removeItem(this.ADMIN_TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_DATA_KEY);

    this.token.set(null);
    this.usuario.set(null);
    this.sesionCambiadaSubject.next(false);
  }

  login(credenciales: LoginRequest): Observable<AuthResponse> {
    this.storage.removeItem(this.ADMIN_TOKEN_KEY);
    this.storage.removeItem(this.ADMIN_DATA_KEY);

    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credenciales).pipe(
      tap((respuesta) => {
        if (respuesta.token && respuesta.usuario) {
          this.guardarSesion(respuesta.token, respuesta.usuario);
        }
      })
    );
  }

  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  obtenerPerfil(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/perfil`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  subirFotoMultipart(archivo: File): Observable<User> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<User>(`${this.API_URL}/perfil/foto`, formData).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  actualizarFotoPerfil(urlFoto: string): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil/foto-url`, { urlFoto }).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  eliminarFotoPerfil(): Observable<User> {
    return this.http.delete<User>(`${this.API_URL}/perfil/foto`).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
      })
    );
  }

  actualizarPerfil(datos: { nombreUsuario?: string; email?: string; bio?: string }): Observable<User> {
    return this.http.patch<User>(`${this.API_URL}/perfil`, datos).pipe(
      tap((usuario) => {
        this.usuario.set(usuario);
        this.storage.setItem(this.USER_KEY, JSON.stringify(usuario));
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

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    if (this.tokenExpirado(token)) {
      this.limpiarSesion();
      return false;
    }
    return true;
  }

  estaLogueado(): boolean { return this.isAuthenticated(); }
  obtenerToken(): string | null { return this.getToken(); }
  getUser(): User | null { return this.usuario(); }
  getUsuarioActual(): User | null { return this.usuario(); }

  public cargarSesionPublica(): void {
    this.cargarSesion();
  }

  public limpiarSesionPublica(): void {
    this.limpiarSesion();
  }
}