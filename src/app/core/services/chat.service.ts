// chat.service.ts - Versión CORREGIDA con STOMP + Solicitudes
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversacion, Mensaje, SolicitudContacto, UsuarioDisponible } from '../models/chat.model';
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

  // ============================================================
  // ✅ CONVERSACIONES Y MENSAJES
  // ============================================================

  listarConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${this.baseUrl}/conversaciones`);
  }

  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.baseUrl}/${usuarioId}`);
  }

  enviarMensajeHttp(usuarioId: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, { contenido });
  }

  // ============================================================
  // ✅ SOLICITUDES DE CONTACTO
  // ============================================================

  // Listar solicitudes de contacto
  listarSolicitudes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(`${this.baseUrl}/solicitudes`);
  }

  // Listar usuarios disponibles (no contactos)
  listarUsuariosDisponibles(): Observable<UsuarioDisponible[]> {
    return this.http.get<UsuarioDisponible[]>(`${this.baseUrl}/usuarios/disponibles`);
  }

  // Enviar solicitud de contacto
  enviarSolicitud(usuarioId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/solicitudes`, { usuarioId });
  }

  // Aceptar solicitud de contacto
  aceptarSolicitud(solicitudId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/solicitudes/${solicitudId}/aceptar`, {});
  }

  // Rechazar solicitud de contacto
  rechazarSolicitud(solicitudId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/solicitudes/${solicitudId}/rechazar`, {});
  }

  // Eliminar contacto
  eliminarContacto(usuarioId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/contactos/${usuarioId}`);
  }

  // ============================================================
  // ✅ WEBSOCKET
  // ============================================================

  conectarWebSocket(usuarioId: number): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('⚠️ WebSocket ya está conectado');
      return;
    }

    this.usuarioIdActual = usuarioId;
    console.log('🔌 Conectando WebSocket para usuario:', usuarioId);

    try {
      const socket = new SockJS('http://localhost:8080/ws');
      
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str: string) => {
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
        // Notificar que el usuario está en línea
        this.notificarEnLinea(usuarioId);
      };

      this.stompClient.onStompError = (frame) => {
        console.error('❌ Error en STOMP:', frame);
      };

      this.stompClient.onDisconnect = () => {
        console.log('🔌 WebSocket desconectado');
        if (this.usuarioIdActual) {
          this.notificarDesconexion(this.usuarioIdActual);
        }
      };

      this.stompClient.activate();
    } catch (error) {
      console.error('❌ Error al conectar WebSocket:', error);
      setTimeout(() => {
        if (this.usuarioIdActual) {
          this.conectarWebSocket(this.usuarioIdActual);
        }
      }, 5000);
    }
  }

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

  private notificarEnLinea(usuarioId: number): void {
    // Notificar a otros usuarios que este usuario está en línea
    // Esto se puede implementar con un canal público
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/status/online',
        body: JSON.stringify({ usuarioId, estado: 'online' }),
      });
    }
  }

  private notificarDesconexion(usuarioId: number): void {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.publish({
        destination: '/app/status/offline',
        body: JSON.stringify({ usuarioId, estado: 'offline' }),
      });
    }
  }

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

  // ============================================================
  // ✅ CALLBACKS
  // ============================================================

  onMensajeRecibido(callback: (mensaje: Mensaje) => void): void {
    this.mensajesCallbacks.push(callback);
  }

  // ============================================================
  // ✅ CONEXIÓN
  // ============================================================

  desconectarWebSocket(): void {
    if (this.stompClient) {
      if (this.usuarioIdActual) {
        this.notificarDesconexion(this.usuarioIdActual);
      }
      this.stompClient.deactivate();
      this.stompClient = null;
      console.log('🔌 WebSocket desconectado manualmente');
    }
    this.usuarioIdActual = null;
  }

  isConnected(): boolean {
    return this.stompClient !== null && this.stompClient.connected;
  }

  getUsuarioIdActual(): number | null {
    return this.usuarioIdActual;
  }
}