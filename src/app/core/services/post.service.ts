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
  // CREAR POST - Envía FormData con categoría y sensibilidad
  // ============================================================
  crear(formData: FormData): Observable<Post> {
    // 1) Fallback categoría
    const categoria = formData.get('categoria');
    if (!categoria || typeof categoria !== 'string' || categoria.trim() === '') {
      if (typeof console !== 'undefined') {
        console.warn('Categoría vacía, usando "otro" por defecto');
      }
      formData.set('categoria', 'otro');
    }

    // 2) Fallback esAnonimo
    if (formData.get('esAnonimo') === null) {
      formData.set('esAnonimo', 'false');
    }

    // 3) Fallback esSensible
    if (formData.get('esSensible') === null) {
      formData.set('esSensible', 'false');
    }

    // 4) Si esSensible=true y no hay motivo, mandar "otro"
    const esSensible = formData.get('esSensible') === 'true';
    const motivo = formData.get('motivoSensibilidad');
    if (esSensible && (!motivo || (typeof motivo === 'string' && motivo.trim() === ''))) {
      formData.set('motivoSensibilidad', 'otro');
    }

    // 5) Si NO es sensible, eliminar motivo para no viajar basura
    if (!esSensible) {
      formData.delete('motivoSensibilidad');
    }

    if (typeof console !== 'undefined') {
      console.log('PostService.crear →', {
        categoria: formData.get('categoria'),
        esAnonimo: formData.get('esAnonimo'),
        esSensible: formData.get('esSensible'),
        motivo: formData.get('motivoSensibilidad'),
      });
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
  // SUBTÍTULOS (sin cambios)
  // ============================================================
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

  listarSubtitulos(adjuntoId: number): Observable<Subtitulo[]> {
    return this.http.get<Subtitulo[]>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos`
    );
  }

  eliminarSubtitulo(adjuntoId: number, subtituloId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/adjuntos/${adjuntoId}/subtitulos/${subtituloId}`
    );
  }

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