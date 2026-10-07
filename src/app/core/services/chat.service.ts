import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  Conversacion,
  Mensaje,
  SolicitudContacto,
  SolicitudContactoDTO,
  UsuarioDisponible
} from '../models/chat.model';

export type RespuestaSonContactos = boolean | { sonContactos: boolean };

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  private readonly conversacionesSubject = new BehaviorSubject<Conversacion[]>([]);
  readonly conversaciones$ = this.conversacionesSubject.asObservable();

  private readonly mensajesCache = new Map<number, Mensaje[]>();

  listarConversaciones(): Observable<Conversacion[]> {
    return this.http
      .get<Conversacion[]>(`${this.baseUrl}/conversaciones`)
      .pipe(
        tap((conversaciones) =>
          this.conversacionesSubject.next(conversaciones)
        )
      );
  }

  cargarConversaciones(): void {
    this.listarConversaciones().subscribe({
      error: (error: unknown) =>
        console.error('Error al cargar conversaciones:', error)
    });
  }

  getConversaciones(): Conversacion[] {
    return this.conversacionesSubject.getValue();
  }

  listarMensajes(usuarioId: number): Observable<Mensaje[]> {
    return this.http
      .get<Mensaje[]>(`${this.baseUrl}/${usuarioId}`)
      .pipe(
        tap((mensajes) => this.mensajesCache.set(usuarioId, mensajes))
      );
  }

  getMensajes(usuarioId: number): Mensaje[] {
    return this.mensajesCache.get(usuarioId) ?? [];
  }

  enviarMensaje(usuarioId: number, contenido: string): Observable<Mensaje> {
    return this.http.post<Mensaje>(`${this.baseUrl}/${usuarioId}`, {
      contenido
    });
  }

  enviarMensajeConArchivos(
    usuarioId: number,
    contenidoOFormulario: string | FormData | null,
    archivos: File[] = []
  ): Observable<Mensaje> {
    const formData =
      contenidoOFormulario instanceof FormData
        ? contenidoOFormulario
        : this.crearFormularioAdjuntos(contenidoOFormulario, archivos);

    return this.http.post<Mensaje>(
      `${this.baseUrl}/${usuarioId}/archivos`,
      formData
    );
  }

  enviarMensajeCompleto(
    usuarioId: number,
    contenido: string | null,
    archivos: File[]
  ): Observable<Mensaje> {
    const texto = contenido?.trim() ?? '';

    if (archivos.length === 0) {
      return this.enviarMensaje(usuarioId, texto);
    }

    return this.enviarMensajeConArchivos(usuarioId, texto, archivos);
  }

  marcarComoLeidos(usuarioId: number): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/mensajes/${usuarioId}/leidos`,
      {}
    );
  }

  listarSolicitudes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(
      `${this.baseUrl}/solicitudes`
    );
  }

  listarSolicitudesEnviadas(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(
      `${this.baseUrl}/solicitudes/enviadas`
    );
  }

  enviarSolicitud(usuarioId: number): Observable<SolicitudContactoDTO> {
    return this.http.post<SolicitudContactoDTO>(
      `${this.baseUrl}/solicitudes`,
      { usuarioId }
    );
  }

  aceptarSolicitud(solicitudId: number): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/solicitudes/${solicitudId}/aceptar`,
      {}
    );
  }

  rechazarSolicitud(solicitudId: number): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/solicitudes/${solicitudId}/rechazar`,
      {}
    );
  }

  sonContactos(usuarioId: number): Observable<RespuestaSonContactos> {
    return this.http.get<RespuestaSonContactos>(
      `${this.baseUrl}/contactos/${usuarioId}`
    );
  }

  listarUsuariosDisponibles(): Observable<UsuarioDisponible[]> {
    return this.http.get<UsuarioDisponible[]>(
      `${this.baseUrl}/usuarios/disponibles`
    );
  }

  eliminarContacto(usuarioId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/contactos/${usuarioId}`
    );
  }

  actualizarConversacion(
    usuarioId: number,
    cambios: Partial<Conversacion>
  ): void {
    const conversaciones = [...this.conversacionesSubject.getValue()];
    const index = conversaciones.findIndex(
      (conversacion) => conversacion.usuarioId === usuarioId
    );

    if (index === -1) {
      return;
    }

    conversaciones[index] = {
      ...conversaciones[index],
      ...cambios
    };
    this.conversacionesSubject.next(conversaciones);
  }

  incrementarNoLeidos(usuarioId: number): void {
    const conversacion = this.conversacionesSubject
      .getValue()
      .find((item) => item.usuarioId === usuarioId);

    if (!conversacion) {
      return;
    }

    this.actualizarConversacion(usuarioId, {
      noLeidos: conversacion.noLeidos + 1
    });
  }

  resetearNoLeidos(usuarioId: number): void {
    this.actualizarConversacion(usuarioId, { noLeidos: 0 });
  }

  obtenerMensajesNoLeidos(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/no-leidos`);
  }

  limpiarCacheMensajes(usuarioId?: number): void {
    if (usuarioId === undefined) {
      this.mensajesCache.clear();
      return;
    }

    this.mensajesCache.delete(usuarioId);
  }

  private crearFormularioAdjuntos(
    contenido: string | null,
    archivos: File[]
  ): FormData {
    const formData = new FormData();
    const texto = contenido?.trim();

    if (texto) {
      formData.append('contenido', texto);
    }

    archivos.forEach((archivo) => {
      formData.append('archivos', archivo, archivo.name);
    });

    return formData;
  }
}
