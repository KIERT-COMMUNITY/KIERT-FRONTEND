import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Anuncio {
  id?: number;
  titulo: string;
  texto: string;
  imagenUrl?: string;
  enlaceUrl?: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnuncioService {
  private http = inject(HttpClient);
  private baseAdmin = '/api/admin/anuncios';
  private basePublico = '/api/anuncios';

  listarPublicos(): Observable<Anuncio[]> {
    return this.http.get<Anuncio[]>(`${this.basePublico}/publicos`);
  }

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