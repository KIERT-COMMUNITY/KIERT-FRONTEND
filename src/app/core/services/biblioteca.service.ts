// src/app/core/services/biblioteca.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecursoBiblioteca } from '../models/biblioteca.model';

@Injectable({ providedIn: 'root' })
export class BibliotecaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ============================================================
  // LECTURA
  // ============================================================

  obtenerTodos(): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca`);
  }

  obtenerPorCategoria(categoria: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/categoria/${categoria}`);
  }

  obtenerDestacados(): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/destacados`);
  }

  obtenerCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biblioteca/categorias`);
  }

  obtenerNiveles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biblioteca/niveles`);
  }

  buscar(query: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(
      `${this.apiUrl}/biblioteca/buscar?query=${encodeURIComponent(query)}`
    );
  }

  // ============================================================
  // 🔥 CRUD DEL USUARIO (usa HTTP real)
  // ============================================================

  agregarRecursoUsuario(datos: Omit<RecursoBiblioteca, 'id' | 'fechaAgregado' | 'esUsuario'>): Observable<RecursoBiblioteca> {
    const payload = {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      url: datos.url,
      categoria: datos.categoria,
      subcategoria: datos.subcategoria,
      autor: datos.autor,
      plataforma: datos.plataforma,
      duracion: datos.duracion,
      nivel: datos.nivel,
      destacado: datos.destacado ?? false,
      tags: datos.tags || []
    };
    console.log('📤 POST /biblioteca/usuario', payload);
    return this.http.post<RecursoBiblioteca>(`${this.apiUrl}/biblioteca/usuario`, payload);
  }

  actualizarRecursoUsuario(id: number | string, datos: Partial<RecursoBiblioteca>): Observable<RecursoBiblioteca> {
    const payload = {
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      url: datos.url,
      categoria: datos.categoria,
      subcategoria: datos.subcategoria,
      autor: datos.autor,
      plataforma: datos.plataforma,
      duracion: datos.duracion,
      nivel: datos.nivel,
      destacado: datos.destacado ?? false,
      tags: datos.tags || []
    };
    console.log('📤 PUT /biblioteca/usuario/' + id, payload);
    return this.http.put<RecursoBiblioteca>(`${this.apiUrl}/biblioteca/usuario/${id}`, payload);
  }

  eliminarRecursoUsuario(id: number | string): Observable<void> {
    console.log('📤 DELETE /biblioteca/usuario/' + id);
    return this.http.delete<void>(`${this.apiUrl}/biblioteca/usuario/${id}`);
  }
}