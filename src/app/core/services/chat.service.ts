// src/app/core/services/chat.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  Conversacion, 
  Mensaje, 
  SolicitudContacto, 
  UsuarioDisponible,
  SolicitudContactoDTO
} from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  // BehaviorSubject para mantener el estado reactivo de las conversaciones
  private conversacionesSubject = new BehaviorSubject<Conversacion[]>([]);
  conversaciones$ = this.conversacionesSubject.asObservable();

  // Cache de mensajes por usuario
  private mensajesCache = new Map<number, Mensaje[]>();

  // ========== CONVERSACIONES ==========
  listarConversaciones(): Observable<Conversacion[]> {
    return this.http.get<Conversacion[]>(`${this.baseUrl}/conversaciones`).pipe(
      tap((conversaciones) => {
        this.conversacionesSubject.next(conversaciones);
      })
    );
  }

  cargarConversaciones(): void {
    this.listarConversaciones().subscribe({
      error: (error) => {
        console.error('Error al cargar conversaciones:', error);
      }
    });
  }

  getConversaciones(): Conversacion[] {
    return this.conversacionesSubject.getValue();
  }

  // ========== MENSAJES ==========
  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return this.http.get<Mensaje[]>(`${this.baseUrl}/${usuarioId}`).pipe(
      tap((mensajes) => {
        this.mensajesCache.set(usuarioId, mensajes);
      })
    );
  }

  getMensajes(usuarioId: number): Mensaje[] {
    return this.mensajesCache.get(usuarioId) || [];
  }

  enviarMensaje(usuarioId: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, { contenido });
  }

  enviarMensajeConArchivos(usuarioId: number, formData: FormData): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}/archivos`, formData);
  }

  // ========== MARCAR MENSAJES COMO LEÍDOS ==========
  marcarComoLeidos(usuarioId: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/mensajes/${usuarioId}/leidos`, {});
  }

  // ========== SOLICITUDES ==========
  listarSolicitudes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(`${this.baseUrl}/solicitudes`);
  }

  enviarSolicitud(usuarioId: number): Observable<SolicitudContactoDTO> {
    return this.http.post<SolicitudContactoDTO>(`${this.baseUrl}/solicitudes`, { usuarioId });
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

  // ========== ACTUALIZACIONES EN TIEMPO REAL ==========
  actualizarConversacion(usuarioId: number, cambios: Partial<Conversacion>): void {
    const conversaciones = this.conversacionesSubject.getValue();
    const index = conversaciones.findIndex(c => c.usuarioId === usuarioId);
    
    if (index !== -1) {
      const updated = { ...conversaciones[index], ...cambios };
      conversaciones[index] = updated;
      this.conversacionesSubject.next([...conversaciones]);
    }
  }

  incrementarNoLeidos(usuarioId: number): void {
    const conversaciones = this.conversacionesSubject.getValue();
    const index = conversaciones.findIndex(c => c.usuarioId === usuarioId);
    
    if (index !== -1) {
      conversaciones[index] = { 
        ...conversaciones[index], 
        noLeidos: (conversaciones[index].noLeidos || 0) + 1 
      };
      this.conversacionesSubject.next([...conversaciones]);
    }
  }

  resetearNoLeidos(usuarioId: number): void {
    const conversaciones = this.conversacionesSubject.getValue();
    const index = conversaciones.findIndex(c => c.usuarioId === usuarioId);
    
    if (index !== -1) {
      conversaciones[index] = { 
        ...conversaciones[index], 
        noLeidos: 0 
      };
      this.conversacionesSubject.next([...conversaciones]);
    }
  }

  // ========== OBTENER MENSAJES NO LEÍDOS ==========
  obtenerMensajesNoLeidos(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/no-leidos`);
  }
}