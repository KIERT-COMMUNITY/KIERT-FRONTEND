import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Comentario, Respuesta, Reacciones } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class ComentarioService {
  private readonly API_URL = `${environment.apiUrl}/comentarios`;

  constructor(private http: HttpClient) {}

  // ========== COMENTARIOS ==========
  
  /** Listar comentarios de un post */
  listarPorPost(postId: number): Observable<Comentario[]> {
    return this.http.get<Comentario[]>(`${this.API_URL}/post/${postId}`);
  }

  /** Crear un nuevo comentario */
  crear(postId: number, contenido: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.API_URL}/post/${postId}`, { contenido });
  }

  /** Eliminar un comentario */
  eliminar(comentarioId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${comentarioId}`);
  }

  /** Editar un comentario */
  editar(comentarioId: number, contenido: string): Observable<Comentario> {
    return this.http.put<Comentario>(`${this.API_URL}/${comentarioId}`, { contenido });
  }

  // ========== RESPUESTAS A COMENTARIOS ==========

  /** Listar respuestas de un comentario */
  listarRespuestas(comentarioId: number): Observable<Respuesta[]> {
    return this.http.get<Respuesta[]>(`${this.API_URL}/${comentarioId}/respuestas`);
  }

  /** Crear una respuesta a un comentario */
  crearRespuesta(comentarioId: number, contenido: string): Observable<Respuesta> {
    return this.http.post<Respuesta>(`${this.API_URL}/${comentarioId}/respuestas`, { contenido });
  }

  /** Eliminar una respuesta */
  eliminarRespuesta(respuestaId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/respuestas/${respuestaId}`);
  }

  /** Editar una respuesta */
  editarRespuesta(respuestaId: number, contenido: string): Observable<Respuesta> {
    return this.http.put<Respuesta>(`${this.API_URL}/respuestas/${respuestaId}`, { contenido });
  }

  // ========== REACCIONES A COMENTARIOS ==========

  /** Reaccionar a un comentario */
  reaccionarComentario(comentarioId: number, tipo: string): Observable<Reacciones> {
    return this.http.post<Reacciones>(`${this.API_URL}/${comentarioId}/reaccionar`, { tipo });
  }

  /** Reaccionar a una respuesta */
  reaccionarRespuesta(respuestaId: number, tipo: string): Observable<Reacciones> {
    return this.http.post<Reacciones>(`${this.API_URL}/respuestas/${respuestaId}/reaccionar`, { tipo });
  }

  // ========== CONTADOR DE COMENTARIOS ==========

  /** Obtener total de comentarios de un post */
  contarPorPost(postId: number): Observable<number> {
    return this.http.get<number>(`${this.API_URL}/post/${postId}/count`);
  }
}