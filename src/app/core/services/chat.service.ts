// src/app/core/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Conversacion, Mensaje, SolicitudContacto, UsuarioDisponible } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  // ========== CONVERSACIONES ==========
  listarConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${this.baseUrl}/conversaciones`);
  }

  // ========== MENSAJES ==========
  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.baseUrl}/${usuarioId}`);
  }

  enviarMensaje(usuarioId: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, { contenido });
  }

  // ========== SOLICITUDES ==========
  listarSolicitudes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(`${this.baseUrl}/solicitudes`);
  }

  enviarSolicitud(usuarioId: number): Observable<SolicitudContacto> {
    return this.http.post<SolicitudContacto>(`${this.baseUrl}/solicitudes`, { usuarioId });
  }

  aceptarSolicitud(solicitudId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/solicitudes/${solicitudId}/aceptar`, {});
  }

  rechazarSolicitud(solicitudId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/solicitudes/${solicitudId}/rechazar`, {});
  }

  // ========== CONTACTOS ==========
  sonContactos(usuarioId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/contactos/${usuarioId}`);
  }

  listarUsuariosDisponibles(): Observable<UsuarioDisponible[]> {
    return this.http.get<UsuarioDisponible[]>(`${this.baseUrl}/usuarios/disponibles`);
  }

  eliminarContacto(usuarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/contactos/${usuarioId}`);
  }
}