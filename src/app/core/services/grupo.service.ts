import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MiembroGrupo {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  email: string;
  fotoPerfilUrl: string;
  rol: string;
  estado: string;
  fechaUnion: string;
  invitadoPor: string;
}

export interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
  fotoUrl: string;
  creadorId: number;
  creadorNombre: string;
  tipo: string;
  fechaCreacion: string;
  totalMiembros: number;
  miembros: MiembroGrupo[];
  rolDelUsuario: string;
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
  emisorFoto: string;
  contenido: string;
  tipoMensaje: string;
  urlArchivo: string;
  nombreArchivo: string;
  fechaEnvio: string;
  propio: boolean;
}

export interface InvitacionGrupo {
  id: number;
  grupoId: number;
  grupoNombre: string;
  grupoFoto: string;
  invitadorId: number;
  invitadorNombre: string;
  fechaInvitacion: string;
}

@Injectable({ providedIn: 'root' })
export class GrupoService {
  private readonly baseUrl = `${environment.apiUrl}/grupos`;
  private http = inject(HttpClient);

  // ===== GRUPOS =====
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
    return this.http.get<MiembroGrupo[]>(`${this.baseUrl}/${grupoId}/miembros`);
  }

  // ===== INVITACIONES =====
  invitarUsuarios(grupoId: number, usuariosIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/${grupoId}/invitar`, { usuariosIds });
  }

  aceptarInvitacion(grupoId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${grupoId}/aceptar`, {});
  }

  rechazarInvitacion(grupoId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${grupoId}/rechazar`, {});
  }

  unirseAGrupo(grupoId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${grupoId}/unirse`, {});
  }

  salirDelGrupo(grupoId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${grupoId}/salir`);
  }

  invitacionesPendientes(): Observable<InvitacionGrupo[]> {
    return this.http.get<InvitacionGrupo[]>(`${this.baseUrl}/invitaciones`);
  }

  // ===== MENSAJES =====
  obtenerMensajes(grupoId: number): Observable<MensajeGrupo[]> {
    return this.http.get<MensajeGrupo[]>(`${this.baseUrl}/${grupoId}/mensajes`);
  }

  enviarMensaje(grupoId: number, contenido: string): Observable<MensajeGrupo> {
    return this.http.post<MensajeGrupo>(`${this.baseUrl}/${grupoId}/mensajes`, { contenido });
  }
}