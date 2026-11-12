// src/app/core/services/chat-global.service.ts
import { Injectable, OnDestroy, inject, isDevMode } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
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
  /** ID del mensaje al que responde (null/undefined si es un mensaje raíz) */
  respuestaAId?: number | null;
}

interface PendienteMensaje {
  contenido: string;
  respuestaAId: number | null;
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

  private pendientes: PendienteMensaje[] = [];
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
  // STOMP: conectar SIEMPRE (logueado o invitado)
  // ============================================================
  conectar(): void {
    if (this.stompClient?.active) return;

    const usuario = this.authService.getUser();
    const token = this.authService.getToken();

    const connectHeaders: Record<string, string> = {};
    if (token) {
      connectHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (usuario?.id != null) {
      connectHeaders['usuarioId'] = String(usuario.id);
    }

    const baseUrl = this.wsUrl.replace(/^http/i, 'ws');

    this.stompClient = new Client({
      brokerURL: `${baseUrl}/ws`,
      connectHeaders,
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        if (isDevMode()) console.log('[CHAT-GLOBAL] STOMP conectado, suscribiendo a /topic/chat-global');
        this.conectadoSubject.next(true);

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
    for (const p of this.pendientes) {
      this.publishMensaje(p.contenido, p.respuestaAId);
    }
    this.pendientes = [];
  }

  // ============================================================
  // ENVIAR
  // ============================================================
  enviarMensaje(contenido: string, respuestaAId?: number | null): void {
    if (!this.estaLogueado) {
      if (isDevMode()) console.warn('[CHAT-GLOBAL] Invitado: no puede enviar');
      return;
    }

    const idRespuesta = respuestaAId ?? null;

    if (!this.stompClient?.connected) {
      if (isDevMode()) console.warn('[CHAT-GLOBAL] No conectado aun, encolando mensaje');
      this.pendientes.push({ contenido, respuestaAId: idRespuesta });
      if (!this.stompClient?.active) this.conectar();
      return;
    }
    this.publishMensaje(contenido, idRespuesta);
  }

  private publishMensaje(contenido: string, respuestaAId: number | null): void {
    if (isDevMode()) {
      console.log('[CHAT-GLOBAL] Publicando a /app/chat-global/enviar:', {
        contenido,
        respuestaAId
      });
    }
    this.stompClient?.publish({
      destination: '/app/chat-global/enviar',
      body: JSON.stringify({ contenido, respuestaAId })
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