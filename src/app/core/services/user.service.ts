// src/app/core/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

export interface SolicitudContacto {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl: string;
  estado: string;
  fechaSolicitud: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerUsuarioPorId(id: number): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/usuarios/${id}`);
  }

  //  NUEVO MÉTODO: Actualizar perfil (incluyendo bio)
  actualizarPerfil(id: number, datos: { nombreUsuario: string; email: string; bio: string }): Observable<User> {
    return this.http.put<User>(`${this.API_URL}/usuarios/${id}`, datos).pipe(
      tap(res => console.log('Perfil actualizado:', res))
    );
  }

  buscarUsuarios(query: string): Observable<User[]> {
    if (!query || query.trim().length < 1) {
      return of([]);
    }

    const url = `${this.API_URL}/usuarios/buscar?q=${encodeURIComponent(query.trim())}`;
    console.log(`Buscando usuarios: ${url}`);

    return this.http.get<any>(url).pipe(
      tap(response => console.log('Respuesta usuarios:', response)),
      map(response => {
        if (Array.isArray(response)) {
          return response as User[];
        }
        if (response && typeof response === 'object') {
          if (response.data && Array.isArray(response.data)) {
            return response.data as User[];
          }
          if (response.content && Array.isArray(response.content)) {
            return response.content as User[];
          }
          if (response.usuarios && Array.isArray(response.usuarios)) {
            return response.usuarios as User[];
          }
        }
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error en búsqueda de usuarios:', error);
        return of([]);
      })
    );
  }

  buscarUsuarioPorNombre(username: string): Observable<User | null> {
    if (!username || username.trim().length < 1) {
      return of(null);
    }

    return this.buscarUsuarios(username.trim()).pipe(
      map(usuarios => {
        const encontrado = usuarios.find(
          u => u.nombreUsuario?.toLowerCase() === username.trim().toLowerCase()
        );
        return encontrado || null;
      }),
      catchError(() => of(null))
    );
  }

  enviarSolicitudContacto(usuarioId: number): Observable<SolicitudContacto> {
    return this.http.post<SolicitudContacto>(
      `${this.API_URL}/usuarios/solicitud/${usuarioId}`,
      {}
    );
  }

  obtenerSolicitudesPendientes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(
      `${this.API_URL}/usuarios/solicitudes/pendientes`
    );
  }

  aceptarSolicitud(solicitudId: number): Observable<SolicitudContacto> {
    return this.http.put<SolicitudContacto>(
      `${this.API_URL}/usuarios/solicitud/${solicitudId}/aceptar`,
      {}
    );
  }

  rechazarSolicitud(solicitudId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/usuarios/solicitud/${solicitudId}`
    );
  }

  obtenerContactos(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.API_URL}/usuarios/contactos`
    );
  }
}