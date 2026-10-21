// src/app/core/services/web-socket.service.ts (fragmento clave)
import { Injectable, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private authService = inject(AuthService);
  private client: Client | null = null;

  conectar(): void {
    if (this.client?.active) return;

    const token = this.authService.obtenerToken();
    if (!token) {
      console.warn('No hay token, no se conecta WebSocket');
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.apiUrl}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${token}`   // ⬅️ CLAVE
      },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('WebSocket conectado');
      },
      onStompError: (frame) => {
        console.error('Error STOMP:', frame.headers['message']);
        this.client?.deactivate();
      }
    });

    this.client.activate();
  }

  desconectar(): void {
    this.client?.deactivate();
    this.client = null;
  }
}