import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Post, Comentario } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly baseUrl = `${environment.apiUrl}/publicaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Post[]> {
    return this.http.get<Post[]>(this.baseUrl);
  }

  obtenerPorId(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.baseUrl}/${id}`);
  }

  // ✅ CREAR POST - Envía FormData con categoría como string
  crear(formData: FormData): Observable<Post> {
    // ✅ Verificar que la categoría existe y no está vacía
    const categoria = formData.get('categoria');
    console.log('📌 PostService - Categoría enviada:', categoria);
    
    if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
      console.warn('⚠️ Categoría vacía, usando "otro" por defecto');
      formData.set('categoria', 'otro');
    }
    
    return this.http.post<Post>(this.baseUrl, formData);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listarComentarios(postId: number): Observable<Comentario[]> {
    return this.http.get<Comentario[]>(`${this.baseUrl}/${postId}/comentarios`);
  }

  comentar(postId: number, contenido: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.baseUrl}/${postId}/comentarios`, { contenido });
  }
}