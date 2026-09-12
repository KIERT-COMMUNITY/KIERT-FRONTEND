// src/app/core/services/notification.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notificacion {
  id: number;
  tipo: 'like' | 'comentario' | 'respuesta' | 'solicitud' | 'sistema' | 'INVITACION_GRUPO';  // ✅ AGREGAR AQUÍ
  mensaje: string;
  leida: boolean;
  fecha: Date;
  usuarioId?: number;
  usuarioNombre?: string;
  usuarioFoto?: string;
  postId?: number;
  comentarioId?: number;
  respuestaId?: number;
  url?: string;
  grupoId?: number;  // ✅ Ya lo tenías
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private notificacionesSubject = new Subject<Notificacion>();
  public notificaciones$ = this.notificacionesSubject.asObservable();

  mensajesNoLeidos = signal<number>(0);

  //  CONEXIÓN REAL CON EL BACKEND
  obtenerNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>(`${this.apiUrl}/notificaciones`);
  }

  contarNoLeidas(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/notificaciones/no-leidas/count`);
  }

  marcarComoLeida(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notificaciones/leer`, { ids: [id] });
  }

  marcarTodasComoLeidas(ids: number[]): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notificaciones/leer`, { ids });
  }

  marcarTodasComoLeidasSimple(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/notificaciones/leer-todas`, {});
  }

  eliminarNotificacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notificaciones/${id}`);
  }

  actualizarContador(total: number): void {
    this.mensajesNoLeidos.set(total);
  }

  resetearContador(): void {
    this.mensajesNoLeidos.set(0);
  }

  agregarNotificacion(notificacion: Notificacion): void {
    this.notificacionesSubject.next(notificacion);
    this.mensajesNoLeidos.update(val => val + 1);
  }
}