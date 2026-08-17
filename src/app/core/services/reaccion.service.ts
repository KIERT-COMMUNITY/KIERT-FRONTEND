// reaccion.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ReaccionResponse {
  likes: number;
  loves: number;
  hahas: number;
  wows: number;
  sads: number;
  angrys: number;
}

@Injectable({ providedIn: 'root' })
export class ReaccionService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  reaccionarPost(postId: number, tipo: string): Observable<ReaccionResponse> {
    return this.http.post<ReaccionResponse>(
      `${this.API_URL}/reacciones/post/${postId}`,
      { tipo }
    );
  }

  reaccionarComentario(comentarioId: number, tipo: string): Observable<{ likes: number; loves: number }> {
    return this.http.post<{ likes: number; loves: number }>(
      `${this.API_URL}/reacciones/comentario/${comentarioId}`,
      { tipo }
    );
  }

  obtenerReaccionesPost(postId: number): Observable<ReaccionResponse> {
    return this.http.get<ReaccionResponse>(`${this.API_URL}/reacciones/post/${postId}`);
  }

  obtenerReaccionesComentario(comentarioId: number): Observable<{ likes: number; loves: number }> {
    return this.http.get<{ likes: number; loves: number }>(`${this.API_URL}/reacciones/comentario/${comentarioId}`);
  }

  usuarioReaccionoPost(postId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.API_URL}/reacciones/post/${postId}/usuario`);
  }
}