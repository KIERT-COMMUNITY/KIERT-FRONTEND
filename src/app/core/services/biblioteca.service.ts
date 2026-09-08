// src/app/core/services/biblioteca.service.ts
import { Injectable, inject, signal } from '@angular/core';
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

  // ✅ CONEXIÓN REAL CON EL BACKEND

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
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/buscar?query=${encodeURIComponent(query)}`);
  }

  buscarPorCategoria(categoria: string, query: string): Observable<RecursoBiblioteca[]> {
    return this.http.get<RecursoBiblioteca[]>(`${this.apiUrl}/biblioteca/buscar/${categoria}?query=${encodeURIComponent(query)}`);
  }

  obtenerPorId(id: number): Observable<RecursoBiblioteca> {
    return this.http.get<RecursoBiblioteca>(`${this.apiUrl}/biblioteca/${id}`);
  }
}