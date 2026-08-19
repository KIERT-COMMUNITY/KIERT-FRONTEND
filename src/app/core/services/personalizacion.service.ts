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

  // ✅ NUEVO MÉTODO: Obtener personalización de otro usuario
  obtenerPersonalizacionPorUsuario(usuarioId: number): Observable<Personalizacion> {
    return this.http.get<Personalizacion>(`${this.API_URL}/usuario/${usuarioId}`);
  }

  guardarPersonalizacion(datos: Partial<Personalizacion>): Observable<Personalizacion> {
    return this.http.put<Personalizacion>(this.API_URL, datos);
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