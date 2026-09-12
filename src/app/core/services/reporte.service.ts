// src/app/core/services/reporte.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CrearReporte {
  tipoReporte: 'POST' | 'COMENTARIO' | 'RESPUESTA' | 'USUARIO';
  motivo: string;
  descripcion: string;
  postId?: number;
  comentarioId?: number;
  respuestaId?: number;
  usuarioReportadoId?: number;
}

export interface Reporte {
  id: number;
  tipoReporte: string;
  motivo: string;
  descripcion: string;
  estado: string;
  fechaCreacion: string;
  reportanteId: number;
  reportanteNombre: string;
  reportanteFoto: string;
  reportadoId: number;
  reportadoNombre: string;
  reportadoFoto: string;
  postId?: number;
  postTitulo?: string;
  comentarioId?: number;
  comentarioContenido?: string;
  respuestaId?: number;
  respuestaContenido?: string;
  revisadoPorId?: number;
  revisadoPorNombre?: string;
  fechaRevision?: string;
  notaModerador?: string;
  accionTomada?: string;
}

export interface ReporteResumen {
  totalPendientes: number;
  totalRevisando: number;
  totalResueltos: number;
  totalRechazados: number;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly baseUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  crearReporte(reporte: CrearReporte): Observable<any> {
    return this.http.post(this.baseUrl, reporte);
  }

  listarReportes(estado?: string, tipo?: string, page = 0, size = 20): Observable<any> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (estado) params = params.set('estado', estado);
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get(this.baseUrl, { params });
  }

  misReportes(): Observable<Reporte[]> {
    return this.http.get<Reporte[]>(`${this.baseUrl}/mis-reportes`);
  }

  actualizarReporte(id: number, data: { estado: string; notaModerador?: string; accionTomada?: string }): Observable<Reporte> {
    return this.http.put<Reporte>(`${this.baseUrl}/${id}`, data);
  }

  obtenerResumen(): Observable<ReporteResumen> {
    return this.http.get<ReporteResumen>(`${this.baseUrl}/resumen`);
  }
}