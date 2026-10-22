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

  // ============================================================
  // REST: historial
  // ============================================================
  obtenerHistorial(page = 0, size = 50): Observable<MensajeGlobal[]> {
    return this.http.get<MensajeGlobal[]>(`${this.apiUrl}/mensajes`, {
      params: { page, size }
    });
  }

  // ============================================================
  // STOMP
  // ============================================================
  conectar(): void {
    if (this.stompClient?.active) return;

    const usuario = this.authService.getUser();
    if (!usuario) {
      console.warn('[CHAT-GLOBAL] No hay usuario autenticado');
      return;
    }

    const token = this.authService.getToken();

    const socket = new SockJS(`${this.wsUrl}/ws`);

    this.stompClient = new Client({
      webSocketFactory: () => socket as any,
      connectHeaders: {
        Authorization: token ? `Bearer ${token}` : '',
        usuarioId: String(usuario.id)
      },
      debug: () => {},
      reconnectDelay: 5000,
      onConnect: () => {
        this.conectadoSubject.next(true);
        this.stompClient?.subscribe('/topic/chat-global', (msg: IMessage) => {
          const mensaje: MensajeGlobal = JSON.parse(msg.body);
          this.mensajesSubject.next(mensaje);
        });
      },
      onDisconnect: () => this.conectadoSubject.next(false),
      onStompError: (frame) => {
        console.error('[CHAT-GLOBAL] STOMP error', frame);
        this.conectadoSubject.next(false);
      },
      onWebSocketClose: () => this.conectadoSubject.next(false)
    });

    this.stompClient.activate();
  }

  enviarMensaje(contenido: string): void {
    if (!this.stompClient?.connected) {
      console.warn('[CHAT-GLOBAL] No conectado, no se puede enviar');
      return;
    }
    this.stompClient.publish({
      destination: '/app/chat-global.enviar',
      body: JSON.stringify({ contenido })
    });
  }

  desconectar(): void {
    this.stompClient?.deactivate();
    this.stompClient = null;
    this.conectadoSubject.next(false);
  }

  ngOnDestroy(): void {
    this.desconectar();
  }
}