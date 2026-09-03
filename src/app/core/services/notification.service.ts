// src/app/core/services/notification.service.ts
import { Injectable, signal } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';

export interface Notificacion {
  id: number;
  tipo: 'like' | 'comentario' | 'respuesta' | 'solicitud' | 'sistema';
  mensaje: string;
  leida: boolean;
  fecha: Date;
  usuarioId?: number;
  usuarioNombre?: string;
  usuarioFoto?: string;
  postId?: number;
  comentarioId?: number;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificacionesSubject = new Subject<Notificacion>();
  public notificaciones$ = this.notificacionesSubject.asObservable();

  mensajesNoLeidos = signal<number>(0);
  private notificacionesCache: Notificacion[] = [];

  constructor() {
    this.notificacionesCache = this.obtenerNotificacionesMock();
  }

  obtenerNotificaciones(): Observable<Notificacion[]> {
    return of(this.notificacionesCache);
  }

  marcarComoLeida(id: number): Observable<void> {
    this.notificacionesCache = this.notificacionesCache.map(n => 
      n.id === id ? { ...n, leida: true } : n
    );
    return of(void 0);
  }

  marcarTodasComoLeidas(ids: number[]): Observable<void> {
    this.notificacionesCache = this.notificacionesCache.map(n => 
      ids.includes(n.id) ? { ...n, leida: true } : n
    );
    return of(void 0);
  }

  eliminarNotificacion(id: number): Observable<void> {
    this.notificacionesCache = this.notificacionesCache.filter(n => n.id !== id);
    return of(void 0);
  }

  actualizarContador(total: number): void {
    this.mensajesNoLeidos.set(total);
  }

  resetearContador(): void {
    this.mensajesNoLeidos.set(0);
  }

  agregarNotificacion(notificacion: Notificacion): void {
    this.notificacionesCache = [notificacion, ...this.notificacionesCache];
    this.notificacionesSubject.next(notificacion);
    this.mensajesNoLeidos.update(val => val + 1);
  }

  private obtenerNotificacionesMock(): Notificacion[] {
    return [
      {
        id: 1,
        tipo: 'like',
        mensaje: '<strong>Juan Pérez</strong> le dio like a tu publicación',
        leida: false,
        fecha: new Date(),
        usuarioId: 1,
        usuarioNombre: 'Juan Pérez',
        url: '/publicacion/1'
      },
      {
        id: 2,
        tipo: 'comentario',
        mensaje: '<strong>María Gómez</strong> comentó en tu publicación',
        leida: false,
        fecha: new Date(Date.now() - 3600000),
        usuarioId: 2,
        usuarioNombre: 'María Gómez',
        postId: 1,
        url: '/publicacion/1'
      },
      {
        id: 3,
        tipo: 'respuesta',
        mensaje: '<strong>Carlos López</strong> respondió a tu comentario',
        leida: true,
        fecha: new Date(Date.now() - 86400000),
        usuarioId: 3,
        usuarioNombre: 'Carlos López',
        postId: 1,
        url: '/publicacion/1'
      },
      {
        id: 4,
        tipo: 'solicitud',
        mensaje: '<strong>Ana Martínez</strong> quiere ser tu contacto',
        leida: false,
        fecha: new Date(Date.now() - 7200000),
        usuarioId: 4,
        usuarioNombre: 'Ana Martínez',
        url: '/chat/solicitudes'
      }
    ];
  }
}