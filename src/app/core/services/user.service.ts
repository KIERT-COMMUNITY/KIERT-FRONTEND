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

  /**
   * Busca usuarios por nombre
   */
  buscarUsuarios(query: string): Observable<User[]> {
    if (!query || query.trim().length < 1) {
      return of([]);
    }

    const url = `${this.API_URL}/usuarios/buscar?q=${encodeURIComponent(query.trim())}`;
    console.log(`🔍 Buscando usuarios: ${url}`);

    // ✅ Tipamos correctamente la respuesta como any para poder acceder a sus propiedades
    return this.http.get<any>(url).pipe(
      tap(response => console.log('📥 Respuesta usuarios:', response)),
      map(response => {
        // Si la respuesta es un array directamente
        if (Array.isArray(response)) {
          return response as User[];
        }
        
        // Si la respuesta es un objeto con propiedades
        if (response && typeof response === 'object') {
          // Si tiene propiedad 'data' con array
          if (response.data && Array.isArray(response.data)) {
            return response.data as User[];
          }
          // Si tiene propiedad 'content' con array
          if (response.content && Array.isArray(response.content)) {
            return response.content as User[];
          }
          // Si tiene propiedad 'usuarios' con array
          if (response.usuarios && Array.isArray(response.usuarios)) {
            return response.usuarios as User[];
          }
        }
        
        // Si no hay resultados, retornar array vacío
        console.warn('⚠️ Respuesta inesperada del servidor:', response);
        return [];
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en búsqueda de usuarios:', error);
        console.error('🔍 Detalles:', error.status, error.statusText);
        return of([]);
      })
    );
  }

  /**
   * Busca un usuario por nombre exacto
   */
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

  /**
   * Envía solicitud de contacto
   */
  enviarSolicitudContacto(usuarioId: number): Observable<SolicitudContacto> {
    return this.http.post<SolicitudContacto>(
      `${this.API_URL}/usuarios/solicitud/${usuarioId}`,
      {}
    );
  }

  /**
   * Obtiene solicitudes pendientes
   */
  obtenerSolicitudesPendientes(): Observable<SolicitudContacto[]> {
    return this.http.get<SolicitudContacto[]>(
      `${this.API_URL}/usuarios/solicitudes/pendientes`
    );
  }

  /**
   * Acepta una solicitud de contacto
   */
  aceptarSolicitud(solicitudId: number): Observable<SolicitudContacto> {
    return this.http.put<SolicitudContacto>(
      `${this.API_URL}/usuarios/solicitud/${solicitudId}/aceptar`,
      {}
    );
  }

  /**
   * Rechaza una solicitud de contacto
   */
  rechazarSolicitud(solicitudId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.API_URL}/usuarios/solicitud/${solicitudId}`
    );
  }

  /**
   * Obtiene los contactos (amigos) del usuario
   */
  obtenerContactos(): Observable<User[]> {
    return this.http.get<User[]>(
      `${this.API_URL}/usuarios/contactos`
    );
  }
}