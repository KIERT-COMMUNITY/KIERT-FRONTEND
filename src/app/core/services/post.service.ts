import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Post, Comentario, Subtitulo } from '../models/post.model';

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

  // ============================================================
  // CREAR POST - Envía FormData con categoría como string
  // ============================================================
  crear(formData: FormData): Observable<Post> {
    const categoria = formData.get('categoria');
    console.log('PostService - Categoría enviada:', categoria);

    if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
      console.warn('Categoría vacía, usando "otro" por defecto');
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

  // ============================================================
  // SUBTÍTULOS
  // ============================================================

  /**
   * Sube un archivo .vtt como subtítulo de un video adjunto.
   */
  subirSubtitulo(
    adjuntoId: number,
    archivo: File,
    idioma: string,
    etiqueta: string,
    porDefecto: boolean = false
  ): Observable<Subtitulo> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('idioma', idioma);
    formData.append('etiqueta', etiqueta);
    formData.append('porDefecto', String(porDefecto));

    return this.http.post<Subtitulo>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos`,
      formData
    );
  }

  /**
   * Lista los subtítulos disponibles de un video.
   */
  listarSubtitulos(adjuntoId: number): Observable<Subtitulo[]> {
    return this.http.get<Subtitulo[]>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos`
    );
  }

  /**
   * Elimina un subtítulo.
   */
  eliminarSubtitulo(adjuntoId: number, subtituloId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos/${subtituloId}`
    );
  }

  /**
   * Genera subtítulos automáticamente usando IA (Whisper, etc.).
   */
  generarSubtitulosAutomaticos(
    adjuntoId: number,
    idioma: string
  ): Observable<Subtitulo> {
    return this.http.post<Subtitulo>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos/auto`,
      { idioma }
    );
  }
}