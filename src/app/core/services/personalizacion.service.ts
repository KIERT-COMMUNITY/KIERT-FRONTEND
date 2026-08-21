import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Personalizacion {
  id: number;
  usuarioId: number;
  temaId: string;
  marcoId: string;
  fondoId: string;
  fotoPerfilUrl: string;
  fotoPortadaUrl: string;
  marcoPersonalizadoUrl: string;
}

export interface Marco {
  id: string;
  nombre: string;
  urlImagen: string;
  tipo: string;
  precio: number;
  gratis: boolean;
}

export interface Fondo {
  id: string;
  nombre: string;
  urlImagen: string;
  tipo: string;
  gradiente: string;
  precio: number;
  gratis: boolean;
}

@Injectable({ providedIn: 'root' })
export class PersonalizacionService {
  private readonly API_URL = `${environment.apiUrl}/personalizacion`;

  constructor(private http: HttpClient) {}

  obtenerPersonalizacion(): Observable<Personalizacion> {
    return this.http.get<Personalizacion>(this.API_URL);
  }

  obtenerPersonalizacionPorUsuario(usuarioId: number): Observable<Personalizacion> {
    return this.http.get<Personalizacion>(`${this.API_URL}/usuario/${usuarioId}`);
  }

  // ✅ GUARDAR PERSONALIZACIÓN CON DTO (PUT)
  guardarPersonalizacion(datos: Partial<Personalizacion>): Observable<Personalizacion> {
    // Asegurar que los campos necesarios estén presentes
    const payload = {
      temaId: datos.temaId || 'default',
      marcoId: datos.marcoId || 'none',
      fondoId: datos.fondoId || 'default',
      fotoPerfilUrl: datos.fotoPerfilUrl || '',
      fotoPortadaUrl: datos.fotoPortadaUrl || '',
      marcoPersonalizadoUrl: datos.marcoPersonalizadoUrl || ''
    };
    return this.http.put<Personalizacion>(this.API_URL, payload);
  }

  // ✅ GUARDAR CON PARÁMETROS (POST - alternativa)
  guardarPersonalizacionParams(temaId: string, marcoId: string, fondoId: string): Observable<Personalizacion> {
    const params = new URLSearchParams();
    params.set('temaId', temaId);
    params.set('marcoId', marcoId);
    params.set('fondoId', fondoId);
    return this.http.post<Personalizacion>(this.API_URL, null, { 
      params: { temaId, marcoId, fondoId } 
    });
  }

  subirFotoPerfil(archivo: File): Observable<Personalizacion> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Personalizacion>(`${this.API_URL}/foto-perfil`, formData);
  }

  subirFotoPortada(archivo: File): Observable<Personalizacion> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    return this.http.post<Personalizacion>(`${this.API_URL}/foto-portada`, formData);
  }

  obtenerMarcos(): Observable<Marco[]> {
    return this.http.get<Marco[]>(`${this.API_URL}/marcos`);
  }

  obtenerFondos(): Observable<Fondo[]> {
    return this.http.get<Fondo[]>(`${this.API_URL}/fondos`);
  }

  comprarMarco(marcoId: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/comprar/marco/${marcoId}`, {});
  }

  comprarFondo(fondoId: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/comprar/fondo/${fondoId}`, {});
  }
}