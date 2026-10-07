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
<<<<<<< HEAD
  invitadoPor: string | null;
  online?: boolean;
  ultimaConexion?: string | null;
=======
  invitadoPor: string;
  enLinea: boolean;               // ✅ NUEVO
  ultimaConexion: string | null;  // ✅ NUEVO
}

export interface GrupoHistorial {
  id: number;
  grupoId: number;
  usuarioId: number | null;
  usuarioNombre: string;
  usuarioFoto: string | null;
  accion: string;
  detalle: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
>>>>>>> origin/develop11
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

export interface InvitacionLink {
  id: number;
  grupoId: number;
  grupoNombre: string;
  token: string;
  urlInvitacion: string;
  creadorId: number;
  creadorNombre: string;
  usosMaximos: number;
  usosActuales: number;
  expiraEn: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaUltimoUso: string | null;
}

export interface CrearInvitacionLink {
  usosMaximos?: number;
  horasExpiracion?: number;
}

export interface InfoInvitacion {
  valida: boolean;
  mensaje: string;
  grupoId: number | null;
  grupoNombre: string | null;
  grupoDescripcion: string | null;
  grupoFoto: string | null;
  creadorNombre: string | null;
  totalMiembros: number | null;
  expiraEn: string | null;
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

<<<<<<< HEAD
  invitarUsuarios(
    grupoId: number,
    usuariosIds: number[]
  ): Observable<RespuestaGrupo> {
    return this.http.post<RespuestaGrupo>(
      `${this.baseUrl}/${grupoId}/invitar`,
      { usuariosIds }
    );
=======
  listarHistorial(grupoId: number): Observable<GrupoHistorial[]> {
    return this.http.get<GrupoHistorial[]>(`${this.baseUrl}/${grupoId}/historial`);
  }

  // ===== INVITACIONES =====
  invitarUsuarios(grupoId: number, usuariosIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/${grupoId}/invitar`, { usuariosIds });
>>>>>>> origin/develop11
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

<<<<<<< HEAD
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
=======
  eliminarGrupo(grupoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${grupoId}`);
  }

  expulsarMiembro(grupoId: number, usuarioId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${grupoId}/miembros/${usuarioId}`);
>>>>>>> origin/develop11
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

<<<<<<< HEAD
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
=======
  enviarMensajeConArchivo(grupoId: number, contenido: string, archivo: File): Observable<MensajeGrupo> {
    const formData = new FormData();
    if (contenido) formData.append('contenido', contenido);
    formData.append('archivo', archivo);
    return this.http.post<MensajeGrupo>(`${this.baseUrl}/${grupoId}/mensajes/con-archivo`, formData);
  }

  // ===== FOTO DEL GRUPO =====
  actualizarFotoGrupo(grupoId: number, foto: File): Observable<Grupo> {
    const formData = new FormData();
    formData.append('foto', foto);
    return this.http.post<Grupo>(`${this.baseUrl}/${grupoId}/foto`, formData);
  }

  eliminarFotoGrupo(grupoId: number): Observable<Grupo> {
    return this.http.delete<Grupo>(`${this.baseUrl}/${grupoId}/foto`);
  }

  actualizarInfoGrupo(grupoId: number, nombre?: string, descripcion?: string): Observable<Grupo> {
    return this.http.patch<Grupo>(`${this.baseUrl}/${grupoId}/info`, { nombre, descripcion });
  }

  // ===== INVITACIONES POR LINK =====
  generarLinkInvitacion(grupoId: number, dto: CrearInvitacionLink): Observable<InvitacionLink> {
    return this.http.post<InvitacionLink>(`${this.baseUrl}/${grupoId}/invitacion-link`, dto);
  }

  listarLinksInvitacion(grupoId: number): Observable<InvitacionLink[]> {
    return this.http.get<InvitacionLink[]>(`${this.baseUrl}/${grupoId}/invitacion-link`);
  }

  desactivarLink(linkId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/invitacion-link/${linkId}`);
  }

  obtenerInfoInvitacion(token: string): Observable<InfoInvitacion> {
    return this.http.get<InfoInvitacion>(`${this.baseUrl}/invitacion/${token}`);
  }

  unirseConLink(token: string): Observable<Grupo> {
    return this.http.post<Grupo>(`${this.baseUrl}/invitacion/${token}/unirse`, {});
  }
}
>>>>>>> origin/develop11
