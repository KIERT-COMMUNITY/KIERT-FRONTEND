// src/app/core/services/notification.service.ts
import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// TIPOS DE NOTIFICACIÓN
// ============================================================
export type TipoNotificacion =
  | 'like'
  | 'comentario'
  | 'respuesta'
  | 'solicitud'
  | 'sistema'
  | 'INVITACION_GRUPO'
  | 'REPORTE_NUEVO'
  | 'REPORTE_RESUELTO'
  | 'REPORTE_RECHAZADO'
  | 'ADVERTENCIA'
  | 'CONTENIDO_ELIMINADO'
  | 'USUARIO_BANEADO';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  fecha: Date;
  usuarioId?: number;
  usuarioNombre?: string;
  usuarioFoto?: string;
  postId?: number;
  comentarioId?: number;
  respuestaId?: number;
  grupoId?: number;
  url?: string;
  
  // ✅ Agrega esta línea para que Angular no lance error en el HTML
  estadoInvitacion?: 'aceptada' | 'rechazada'; 
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

  // ============================================================
  // CRUD
  // ============================================================

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

  // ============================================================
  // CONTADOR GLOBAL
  // ============================================================

  actualizarContador(total: number): void {
    this.mensajesNoLeidos.set(total);
  }

  resetearContador(): void {
    this.mensajesNoLeidos.set(0);
  }

  // ============================================================
  // WEBSOCKET / PUSH LOCAL
  // ============================================================

  agregarNotificacion(notificacion: Notificacion): void {
    this.notificacionesSubject.next(notificacion);
    this.mensajesNoLeidos.update(val => val + 1);
  }

  // ============================================================
  // ✅ HELPERS PARA REPORTES
  // ============================================================

  /**
   * Devuelve true si la notificación es de tipo reporte.
   */
  esNotificacionDeReporte(tipo: TipoNotificacion): boolean {
    return tipo === 'REPORTE_NUEVO'
        || tipo === 'REPORTE_RESUELTO'
        || tipo === 'REPORTE_RECHAZADO'
        || tipo === 'ADVERTENCIA'
        || tipo === 'CONTENIDO_ELIMINADO'
        || tipo === 'USUARIO_BANEADO';
  }

  /**
   * Devuelve el color asociado a cada tipo de notificación.
   */
  getColorTipo(tipo: TipoNotificacion): string {
    const colores: Record<TipoNotificacion, string> = {
      'like': '#f85149',
      'comentario': '#2dd4bf',
      'respuesta': '#58a6ff',
      'solicitud': '#f9ca24',
      'sistema': '#8b98a5',
      'INVITACION_GRUPO': '#6c5ce7',
      'REPORTE_NUEVO': '#f59e0b',
      'REPORTE_RESUELTO': '#10b981',
      'REPORTE_RECHAZADO': '#ef4444',
      'ADVERTENCIA': '#f59e0b',
      'CONTENIDO_ELIMINADO': '#ef4444',
      'USUARIO_BANEADO': '#dc2626'
    };
    return colores[tipo] || '#8b98a5';
  }

  /**
   * Devuelve la etiqueta legible de cada tipo de notificación.
   */
  getEtiquetaTipo(tipo: TipoNotificacion): string {
    const etiquetas: Record<TipoNotificacion, string> = {
      'like': 'Me gusta',
      'comentario': 'Comentario',
      'respuesta': 'Respuesta',
      'solicitud': 'Solicitud',
      'sistema': 'Sistema',
      'INVITACION_GRUPO': 'Invitación a grupo',
      'REPORTE_NUEVO': 'Nuevo reporte',
      'REPORTE_RESUELTO': 'Reporte resuelto',
      'REPORTE_RECHAZADO': 'Reporte rechazado',
      'ADVERTENCIA': 'Advertencia',
      'CONTENIDO_ELIMINADO': 'Contenido eliminado',
      'USUARIO_BANEADO': 'Cuenta suspendida'
    };
    return etiquetas[tipo] || 'Notificación';
  }
}