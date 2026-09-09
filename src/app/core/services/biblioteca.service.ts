// src/app/core/services/biblioteca.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecursoBiblioteca } from '../models/biblioteca.model';

@Injectable({
  providedIn: 'root'
})
export class BibliotecaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ✅ Obtener todos los recursos desde el backend
  obtenerTodos(): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca`);
  }

  // ✅ Obtener por categoría
  obtenerPorCategoria(categoria: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/categoria/${categoria}`);
  }

  // ✅ Obtener destacados
  obtenerDestacados(): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/destacados`);
  }

  // ✅ Obtener categorías
  obtenerCategorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biblioteca/categorias`);
  }

  // ✅ Obtener niveles (si los usas)
  obtenerNiveles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/biblioteca/niveles`);
  }

  // ✅ Buscar recursos
  buscar(query: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/buscar?query=${encodeURIComponent(query)}`);
  }

  // ✅ Buscar por categoría
  buscarPorCategoria(categoria: string, query: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/buscar/${categoria}?query=${encodeURIComponent(query)}`);
  }

  // ✅ Obtener por ID
  obtenerPorId(id: number): Observable<RecursoBiblioteca> {
    return this.http.get<RecursoBiblioteca>(`${this.apiUrl}/biblioteca/${id}`);
  }
}