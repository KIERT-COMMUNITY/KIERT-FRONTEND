// post.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Post, Comentario } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly baseUrl = `${environment.apiUrl}/publicaciones`;

  constructor(private http: HttpClient) {}

  // ========== LISTAR POSTS ==========
  listar(): Observable<Post[]> {
    return this.http.get<Post[]>(this.baseUrl);
  }

  // ========== OBTENER POST POR ID ==========
  obtenerPorId(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.baseUrl}/${id}`);
  }

  // ========== CREAR POST ==========
  crear(formData: FormData): Observable<Post> {
    return this.http.post<Post>(this.baseUrl, formData);
  }

  // ========== LISTAR COMENTARIOS ==========
  listarComentarios(postId: number): Observable<Comentario[]> {
    return this.http.get<Comentario[]>(`${this.baseUrl}/${postId}/comentarios`);
  }

  // ========== CREAR COMENTARIO ==========
  comentar(postId: number, contenido: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.baseUrl}/${postId}/comentarios`, { contenido });
  }

  // ✅ ========== ELIMINAR POST ==========
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}