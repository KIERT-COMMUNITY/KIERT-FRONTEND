// src/app/core/services/chat-global.service.ts
import { Injectable, OnDestroy, inject, isDevMode } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface MensajeGlobal {
  id: number;
  autorId: number;
  autorNombreUsuario: string;
  autorFotoPerfilUrl: string | null;
  marcoId?: string | null;
  contenido: string;
  fechaEnvio: string;
}

@Injectable({ providedIn: 'root' })
export class ChatGlobalService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private stompClient: Client | null = null;
  private readonly mensajesSubject = new Subject<MensajeGlobal>();
  private readonly conectadoSubject = new BehaviorSubject<boolean>(false);

  readonly mensajes$ = this.mensajesSubject.asObservable();
  readonly conectado$ = this.conectadoSubject.asObservable();

  private readonly apiUrl = `${environment.apiUrl}/chat-global`;
  private readonly wsUrl = environment.wsUrl;

  private pendientes: string[] = [];
  private suscripcionTopic: { unsubscribe: () => void } | null = null;

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  // ============================================================
  // REST: historial (publico)
  // ============================================================
  obtenerHistorial(page = 0, size = 50): Observable<MensajeGlobal[]> {
    return this.http.get<MensajeGlobal[]>(`${this.apiUrl}/mensajes`, {
      params: { page, size }
    });
  }

  // ============================================================
  // STOMP: solo conectar si hay usuario autenticado
  // ============================================================
  conectar(): void {
    if (this.stompClient?.active) return;

    const usuario = this.authService.getUser();
    const token = this.authService.getToken();

    if (!usuario || !token) {
      if (isDevMode()) console.warn('[CHAT-GLOBAL] Invitado: no se conecta al STOMP');
      return;
    }

    // Normalizar URL: SockJS requiere http(s), NO ws(s).
    const baseUrl = this.wsUrl
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://');

    let socket: any;
    try {
      socket = new SockJS(`${baseUrl}/ws`);
    } catch (e) {
      if (isDevMode()) console.error('[CHAT-GLOBAL] Error creando SockJS con URL', baseUrl, e);
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        usuarioId: String(usuario.id)
      },
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        if (isDevMode()) console.log('[CHAT-GLOBAL] STOMP conectado, suscribiendo a /topic/chat-global');
        this.conectadoSubject.next(true);

        // Cancelar suscripcion previa si la hubiera (evita duplicados en reconexion)
        this.suscripcionTopic?.unsubscribe();

        this.suscripcionTopic = this.stompClient!.subscribe(
          '/topic/chat-global',
          (msg: IMessage) => {
            if (isDevMode()) console.log('[CHAT-GLOBAL] Mensaje recibido del topic:', msg.body);
            try {
              const mensaje: MensajeGlobal = JSON.parse(msg.body);
              this.mensajesSubject.next(mensaje);
            } catch (e) {
              if (isDevMode()) console.error('[CHAT-GLOBAL] Error parseando mensaje', e, msg.body);
            }
          }
        );

        this.flushPendientes();
      },
      onDisconnect: () => {
        this.suscripcionTopic = null;
        this.conectadoSubject.next(false);
      },
      onStompError: (frame) => {
        if (isDevMode()) {
          console.error('[CHAT-GLOBAL] STOMP error', frame.headers['message'], frame.body);
        }
        this.suscripcionTopic = null;
        this.conectadoSubject.next(false);
      },
      onWebSocketClose: () => {
        this.suscripcionTopic = null;
        this.conectadoSubject.next(false);
      }
    });

    this.stompClient.activate();
  }

  private flushPendientes(): void {
    if (!this.stompClient?.connected) return;
    for (const contenido of this.pendientes) {
      this.publishMensaje(contenido);
    }
    this.pendientes = [];
  }

  enviarMensaje(contenido: string): void {
    if (!this.estaLogueado) {
      if (isDevMode()) console.warn('[CHAT-GLOBAL] Invitado: no puede enviar');
      return;
    }
    if (!this.stompClient?.connected) {
      if (isDevMode()) console.warn('[CHAT-GLOBAL] No conectado aun, encolando mensaje');
      this.pendientes.push(contenido);
      if (!this.stompClient?.active) this.conectar();
      return;
    }
    this.publishMensaje(contenido);
  }

  private publishMensaje(contenido: string): void {
    if (isDevMode()) console.log('[CHAT-GLOBAL] Publicando a /app/chat-global/enviar:', contenido);
    this.stompClient?.publish({
      destination: '/app/chat-global/enviar',
      body: JSON.stringify({ contenido })
    });
  }

  desconectar(): void {
    this.suscripcionTopic?.unsubscribe();
    this.suscripcionTopic = null;
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.pendientes = [];
    this.conectadoSubject.next(false);
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}