import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CompartirPost {
  tipoCompartido: 'INTERNO' | 'EXTERNO';
  comentario?: string;
}

export interface Compartido {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioFoto: string;
  postId: number;
  postTitulo: string;
  tipoCompartido: string;
  comentario: string;
  fechaCreacion: string;
}

@Injectable({ providedIn: 'root' })
export class CompartidoService {
  private readonly baseUrl = `${environment.apiUrl}/publicaciones`;

  constructor(private http: HttpClient) {}

  compartir(postId: number, data: CompartirPost): Observable<any> {
    return this.http.post(`${this.baseUrl}/${postId}/compartir`, data);
  }

  listarCompartidos(postId: number): Observable<Compartido[]> {
    return this.http.get<Compartido[]>(`${this.baseUrl}/${postId}/compartidos`);
  }

  contarCompartidos(postId: number): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.baseUrl}/${postId}/compartidos/count`);
  }
}