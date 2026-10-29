// src/app/core/services/chat-global.service.ts
import { Injectable, OnDestroy, inject } from '@angular/core';
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
      console.warn('[CHAT-GLOBAL] Invitado: no se conecta al STOMP');
      return;
    }

    const socket = new SockJS(`${this.wsUrl}/ws`);

    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        usuarioId: String(usuario.id)
      },
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        this.conectadoSubject.next(true);

        // Suscripcion al topic
        this.stompClient?.subscribe('/topic/chat-global', (msg: IMessage) => {
          try {
            const mensaje: MensajeGlobal = JSON.parse(msg.body);
            this.mensajesSubject.next(mensaje);
          } catch (e) {
            console.error('[CHAT-GLOBAL] Error parseando mensaje', e);
          }
        });

        // Reenviar mensajes pendientes (si implementas una cola)
        this.flushPendientes();
      },
      onDisconnect: () => this.conectadoSubject.next(false),
      onStompError: (frame) => {
        console.error('[CHAT-GLOBAL] STOMP error', frame.headers['message'], frame.body);
        this.conectadoSubject.next(false);
      },
      onWebSocketClose: () => this.conectadoSubject.next(false)
    });

    this.stompClient.activate();
  }

  // Cola simple de mensajes pendientes (por si el usuario envia antes de conectar)
  private pendientes: string[] = [];

  private flushPendientes(): void {
    if (!this.stompClient?.connected) return;
    for (const contenido of this.pendientes) {
      this.publishMensaje(contenido);
    }
    this.pendientes = [];
  }

  enviarMensaje(contenido: string): void {
    if (!this.estaLogueado) {
      console.warn('[CHAT-GLOBAL] Invitado: no puede enviar');
      return;
    }
    if (!this.stompClient?.connected) {
      console.warn('[CHAT-GLOBAL] No conectado aun, encolando mensaje');
      this.pendientes.push(contenido);
      // Intentar reconectar
      if (!this.stompClient?.active) this.conectar();
      return;
    }
    this.publishMensaje(contenido);
  }

  private publishMensaje(contenido: string): void {
    this.stompClient?.publish({
      destination: '/app/chat-global/enviar',   // ⚠️ con SLASH, verifica tu @MessageMapping
      body: JSON.stringify({ contenido })
    });
  }

  desconectar(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.pendientes = [];
    this.conectadoSubject.next(false);
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}