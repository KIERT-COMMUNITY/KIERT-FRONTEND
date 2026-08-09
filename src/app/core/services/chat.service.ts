// chat.service.ts -> lógica de conversaciones y mensajes.
// HOY con datos MOCK. Cuando se conecte el backend, esto se reemplaza por
// llamadas HTTP (histórico de mensajes) + WebSocket/STOMP para tiempo real
// (Spring Boot soporta WebSocket nativo, ideal para el chat en vivo).
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversacion, Mensaje } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  listarConversaciones(): Observable<Conversacion[]> {
    return of([
      { usuarioId: 2, nombreUsuario: 'root_ana', ultimoMensaje: 'Gracias por la info del phishing', noLeidos: 2 },
      { usuarioId: 3, nombreUsuario: 'kai_dev', ultimoMensaje: '¿Ya recuperaste el correo?', noLeidos: 0 },
    ]); // MOCK
  }

  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return of([
      { id: 1, emisorId: usuarioId, contenido: 'Hola, vi tu publicación sobre el phishing', fechaEnvio: '2026-08-08T10:00:00Z', propio: false },
      { id: 2, emisorId: 1, contenido: 'Hola! sí, cuéntame en qué te puedo ayudar', fechaEnvio: '2026-08-08T10:02:00Z', propio: true },
    ]); // MOCK
  }

  // enviarMensaje real: POST al backend, que a su vez lo reenvía por WebSocket
  // al usuario destino si está conectado en ese momento.
  // enviarMensaje(usuarioId: number, contenido: string) {
  //   return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, { contenido });
  // }
}
