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
  enlaceUrl?: string;
  activo?: boolean;
  destacado?: boolean;
  fechaCreacion?: string;
  fechaPublicacion?: string;
}

@Injectable({ providedIn: 'root' })
export class AnuncioService {
  private http = inject(HttpClient);
  private baseAdmin = `${environment.apiUrl}/admin/anuncios`;
  private basePublico = `${environment.apiUrl}/anuncios`;

  // === PUBLICO (todos los usuarios logueados) ===
  listarPublicos(): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(`${this.basePublico}/publicos`);
  }

  // === ADMIN ===
  listarTodos(): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(this.baseAdmin);
  }

  crear(formData: FormData): Observable<Anuncio> {
    return this.http.post<Anuncio>(this.baseAdmin, formData);
  }

  actualizar(id: number, formData: FormData): Observable<Anuncio> {
    return this.http.put<Anuncio>(`${this.baseAdmin}/${id}`, formData);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseAdmin}/${id}`);
  }
}