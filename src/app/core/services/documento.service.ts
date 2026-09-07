// src/app/core/services/documento.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Documento, CrearDocumentoDTO } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ========== CATEGORÍAS ==========
  obtenerCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/documentos/categorias`);
  }

  // ========== LISTAR ==========
  listarTodos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.apiUrl}/documentos`);
  }

  listarPorCategoria(categoria: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.apiUrl}/documentos/categoria/${encodeURIComponent(categoria)}`);
  }

  listarPorUsuario(usuarioId: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.apiUrl}/documentos/usuario/${usuarioId}`);
  }

  obtenerPorId(id: number): Observable<Documento> {
    return this.http.get<Documento>(`${this.apiUrl}/documentos/${id}`);
  }

  // ========== BUSCAR ==========
  buscar(query: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.apiUrl}/documentos/buscar?query=${encodeURIComponent(query)}`);
  }

  buscarPorCategoria(categoria: string, query: string): Observable<Documento[]> {
    return this.http.get<Documento[]>(
      `${this.apiUrl}/documentos/buscar/${encodeURIComponent(categoria)}?query=${encodeURIComponent(query)}`
    );
  }

  // ========== CREAR ==========
  crear(datos: CrearDocumentoDTO, archivo: File): Observable<Documento> {
    const formData = new FormData();
    formData.append('titulo', datos.titulo);
    formData.append('descripcion', datos.descripcion);
    if (datos.categoria) formData.append('categoria', datos.categoria);
    if (datos.categoriaPersonalizada) formData.append('categoriaPersonalizada', datos.categoriaPersonalizada);
    formData.append('archivo', archivo);

    return this.http.post<Documento>(`${this.apiUrl}/documentos`, formData);
  }

  // ========== ACTUALIZAR ==========
  actualizar(id: number, datos: CrearDocumentoDTO): Observable<Documento> {
    return this.http.put<Documento>(`${this.apiUrl}/documentos/${id}`, datos);
  }

  // ========== ELIMINAR ==========
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/documentos/${id}`);
  }

  // ========== DESCARGAR ==========
  incrementarDescargas(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/documentos/${id}/descargar`, {});
  }
}