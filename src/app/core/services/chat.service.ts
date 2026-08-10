// chat.service.ts - Versión CORREGIDA con STOMP
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversacion, Mensaje } from '../models/chat.model';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// ✅ Asegurar que global existe para STOMP
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/chat`;
  private stompClient: Client | null = null;
  private mensajesCallbacks: ((mensaje: Mensaje) => void)[] = [];
  private usuarioIdActual: number | null = null;

  constructor(private http: HttpClient) {}

  listarConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${this.baseUrl}/conversaciones`);
  }

  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.baseUrl}/${usuarioId}`);
  }

  enviarMensajeHttp(usuarioId: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, { contenido });
  }

  // ========== CONECTAR WEBSOCKET ==========
  conectarWebSocket(usuarioId: number): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('⚠️ WebSocket ya está conectado');
      return;
    }

    this.usuarioIdActual = usuarioId;
    console.log('🔌 Conectando WebSocket para usuario:', usuarioId);

    try {
      // ✅ Usar SockJS con la URL correcta
      const socket = new SockJS('http://localhost:8080/ws');
      
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str: string) => {
          // Solo mostrar logs importantes
          if (str.includes('CONNECTED') || str.includes('ERROR')) {
            console.log('📡 STOMP:', str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.stompClient.onConnect = () => {
        console.log('✅ WebSocket conectado');
        this.suscribirseACanal(usuarioId);
      };

      this.stompClient.onStompError = (frame) => {
        console.error('❌ Error en STOMP:', frame);
      };

      this.stompClient.onDisconnect = () => {
        console.log('🔌 WebSocket desconectado');
      };

      this.stompClient.activate();
    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
      // Intentar reconectar después de 5 segundos
      setTimeout(() => {
        if (this.usuarioIdActual) {
          this.conectarWebSocket(this.usuarioIdActual);
        }
      }, 5000);
    }
  }

  // ========== SUSCRIBIRSE A CANAL ==========
  private suscribirseACanal(usuarioId: number): void {
    if (!this.stompClient) return;

    const canal = `/topic/chat/${usuarioId}`;
    console.log('📡 Suscribiéndose a:', canal);

    try {
      this.stompClient.subscribe(canal, (mensaje) => {
        try {
          const datos = JSON.parse(mensaje.body);
          console.log('📩 Nuevo mensaje recibido:', datos);
          this.mensajesCallbacks.forEach(callback => callback(datos));
        } catch (error) {
          console.error('❌ Error al procesar mensaje:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error al suscribirse:', error);
    }
  }

  // ========== ENVIAR MENSAJE POR WEBSOCKET ==========
  enviarMensajeWebSocket(emisorId: number, receptorId: number, contenido: string): void {
    if (!this.stompClient || !this.stompClient.connected) {
      console.warn('⚠️ WebSocket no conectado, usando HTTP');
      this.enviarMensajeHttp(receptorId, contenido).subscribe();
      return;
    }

    const destino = `/app/chat/${emisorId}/${receptorId}`;
    const mensaje = { contenido };

    try {
      this.stompClient.publish({
        destination: destino,
        body: JSON.stringify(mensaje),
      });
      console.log('📤 Mensaje enviado por WebSocket');
    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
    }
  }

  // ========== REGISTRAR CALLBACK ==========
  onMensajeRecibido(callback: (mensaje: Mensaje) => void): void {
    this.mensajesCallbacks.push(callback);
  }

  // ========== DESCONECTAR ==========
  desconectarWebSocket(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
      console.log('🔌 WebSocket desconectado manualmente');
    }
    this.usuarioIdActual = null;
  }

  isConnected(): boolean {
    return this.stompClient !== null && this.stompClient.connected;
  }
}