import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MensajeArchivo } from '../models/chat.model';

export interface RespuestaGrupo {
  mensaje: string;
}

export interface MiembroGrupo {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  email: string;
  fotoPerfilUrl: string | null;
  rol: string;
  estado: string;
  fechaUnion: string;
  invitadoPor: string | null;
  online?: boolean;
  ultimaConexion?: string | null;
}

export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string | null;
  fotoUrl: string | null;
  creadorId: number;
  creadorNombre: string;
  tipo: string;
  fechaCreacion: string;
  totalMiembros: number;
  miembros: MiembroGrupo[];
  rolDelUsuario: string | null;
  miembrosEnLinea?: number;
}

export interface CrearGrupo {
  nombre: string;
  descripcion: string;
  tipo: 'PRIVADO' | 'PUBLICO';
  usuariosInvitados: number[];
}

export interface MensajeGrupo {
  id: number;
  grupoId: number;
  emisorId: number;
  emisorNombre: string;
  emisorFoto: string | null;
  contenido: string | null;
  tipoMensaje: string;
  urlArchivo: string | null;
  nombreArchivo: string | null;
  fechaEnvio: string;
  propio: boolean;
  archivos?: MensajeArchivo[] | null;
}

export interface InvitacionGrupo {
  id: number;
  grupoId: number;
  grupoNombre: string;
  grupoFoto: string | null;
  invitadorId: number | null;
  invitadorNombre: string;
  fechaInvitacion: string;
}

@Injectable({ providedIn: 'root' })
export class GrupoService {
  private readonly baseUrl = `${environment.apiUrl}/grupos`;
  private readonly http = inject(HttpClient);

  crearGrupo(dto: CrearGrupo): Observable<Grupo> {
    return this.http.post<Grupo>(this.baseUrl, dto);
  }

  misGrupos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(`${this.baseUrl}/mis-grupos`);
  }

  gruposPublicos(): Observable<Grupo[]> {
    return this.http.get<Grupo[]>(`${this.baseUrl}/publicos`);
  }

  obtenerGrupo(id: number): Observable<Grupo> {
    return this.http.get<Grupo>(`${this.baseUrl}/${id}`);
  }

  listarMiembros(grupoId: number): Observable<MiembroGrupo[]> {
    return this.http.get<MiembroGrupo[]>(
      `${this.baseUrl}/${grupoId}/miembros`
    );
  }

  invitarUsuarios(
    grupoId: number,
    usuariosIds: number[]
  ): Observable<RespuestaGrupo> {
    return this.http.post<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/invitar`,
      { usuariosIds }
    );
  }

  aceptarInvitacion(grupoId: number): Observable<RespuestaGrupo> {
    return this.http.post<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/aceptar`,
      {}
    );
  }

  rechazarInvitacion(grupoId: number): Observable<RespuestaGrupo> {
    return this.http.post<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/rechazar`,
      {}
    );
  }

  unirseAGrupo(grupoId: number): Observable<RespuestaGrupo> {
    return this.http.post<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/unirse`,
      {}
    );
  }

  salirDelGrupo(grupoId: number): Observable<RespuestaGrupo> {
    return this.http.delete<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/salir`
    );
  }

  invitacionesPendientes(): Observable<InvitacionGrupo[]> {
    return this.http.get<InvitacionGrupo[]>(
      `${this.baseUrl}/invitaciones`
    );
  }

  eliminarGrupo(grupoId: number): Observable<RespuestaGrupo> {
    return this.http.delete<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}`
    );
  }

  expulsarMiembro(
    grupoId: number,
    usuarioId: number
  ): Observable<RespuestaGrupo> {
    return this.http.delete<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/miembros/${usuarioId}`
    );
  }

  obtenerMensajes(grupoId: number): Observable<MensajeGrupo[]> {
    return this.http.get<MensajeGrupo[]>(
      `${this.baseUrl}/${grupoId}/mensajes`
    );
  }

  enviarMensaje(
    grupoId: number,
    contenido: string
  ): Observable<MensajeGrupo> {
    return this.http.post<MensajeGrupo>(
      `${this.baseUrl}/${grupoId}/mensajes`,
      { contenido }
    );
  }

  enviarMensajeConArchivos(
    grupoId: number,
    contenido: string | null,
    archivos: File[]
  ): Observable<MensajeGrupo> {
    const formData = new FormData();
    const texto = contenido?.trim();

    if (texto) {
      formData.append('contenido', texto);
    }

    archivos.forEach((archivo) => {
      formData.append('archivos', archivo, archivo.name);
    });

    return this.http.post<MensajeGrupo>(
      `${this.baseUrl}/${grupoId}/mensajes/archivos`,
      formData
    );
  }
}
