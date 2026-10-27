// src/app/core/services/admin-bienvenida.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bienvenida {
  titulo: string;
  contenido: string;
  fechaActualizacion: string | null;
  actualizadoPorId?: number | null;
  actualizadoPorNombre?: string | null;
}

export interface HistorialBienvenida {
  id: number;
  tituloAnterior: string | null;
  contenidoAnterior: string | null;
  tituloNuevo: string;
  contenidoNuevo: string;
  cambiadoPorId: number | null;
  cambiadoPorNombre: string | null;
  fechaCambio: string;
  ipCambio: string | null;
}

@Injectable({ providedIn: 'root' })
export class AdminBienvenidaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin/bienvenida`;

  obtener(): Observable<Bienvenida> {
    return this.http.get<Bienvenida>(this.base);
  }

  actualizar(titulo: string, contenido: string): Observable<Bienvenida> {
    return this.http.put<Bienvenida>(this.base, { titulo, contenido });
  }

  listarHistorial(page = 0, size = 20): Observable<HistorialBienvenida[]> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<HistorialBienvenida[]>(`${this.base}/historial`, { params });
  }
}