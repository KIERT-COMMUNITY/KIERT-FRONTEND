// src/app/core/services/anuncio.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Anuncio {
  id?: number;
  titulo: string;
  texto: string;
  imagenUrl?: string;
  imagenPublicId?: string;
  enlaceUrl?: string;
  activo?: boolean;
  destacado?: boolean;
  esFlotante?: boolean; // ✅ NUEVO CAMPO
  fechaCreacion?: string;
  fechaPublicacion?: string;
}

@Injectable({ providedIn: 'root' })
export class AnuncioService {
  private http = inject(HttpClient);
  private readonly API = `${environment.apiUrl}/admin/anuncios`;
  private readonly API_PUBLICOS = `${environment.apiUrl}/anuncios`;

  // ============================================================
  // PÚBLICOS
  // ============================================================
  listarPublicos(): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(`${this.API_PUBLICOS}/publicos`);
  }

  // ✅ NUEVO: Obtener el anuncio para el banner flotante
  obtenerFlotante(): Observable<Anuncio> {
    return this.http.get<Anuncio>(`${this.API_PUBLICOS}/flotante`);
  }

  // ============================================================
  // ADMIN
  // ============================================================
  listarTodos(): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(this.API);
  }

  obtener(id: number): Observable<Anuncio> {
    return this.http.get<Anuncio>(`${this.API}/${id}`);
  }

  crear(formData: FormData): Observable<Anuncio> {
    return this.http.post<Anuncio>(this.API, formData);
  }

  actualizar(id: number, formData: FormData): Observable<Anuncio> {
    return this.http.put<Anuncio>(`${this.API}/${id}`, formData);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
}