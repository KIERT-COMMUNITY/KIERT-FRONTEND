// src/app/core/services/reporte.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ============================================================
// INTERFACES
// ============================================================

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
  reportadoId?: number;
  reportadoNombre?: string;
  reportadoFoto?: string;
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

// ============================================================
// SERVICIO
// ============================================================

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private http = inject(HttpClient);

  // ✅ URLs SEPARADAS
  private readonly API_USER  = `${environment.apiUrl}/reportes`;
  private readonly API_ADMIN = `${environment.apiUrl}/admin/reportes`;

  // ============================================================
  // USUARIOS NORMALES — crear y ver sus propios reportes
  // ============================================================

  /**
   * Crear un reporte (lo usan los usuarios normales)
   * POST /api/reportes
   */
  crearReporte(reporte: CrearReporte): Observable<any> {
    return this.http.post(this.API_USER, reporte);
  }

  /**
   * Ver mis propios reportes (usuario normal)
   * GET /api/reportes/mis-reportes
   */
  misReportes(): Observable<Reporte[]> {
    return this.http.get<Reporte[]>(`${this.API_USER}/mis-reportes`);
  }

  // ============================================================
  // ADMIN — solo para CEO/ADMIN/MODERADOR
  // ============================================================

  /**
   * Listar TODOS los reportes (panel admin)
   * GET /api/admin/reportes?estado=&tipo=&page=&size=
   */
  listarReportes(estado?: string, tipo?: string, page = 0, size = 20): Observable<any> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (estado) params = params.set('estado', estado);
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get(this.API_ADMIN, { params });
  }

  /**
   * Resumen para el dashboard admin
   * GET /api/admin/reportes/resumen
   */
  obtenerResumen(): Observable<ReporteResumen> {
    return this.http.get<ReporteResumen>(`${this.API_ADMIN}/resumen`);
  }

  /**
   * Actualizar estado de un reporte (panel admin)
   * PUT /api/admin/reportes/{id}
   */
  actualizarReporte(
    id: number,
    data: { estado: string; notaModerador?: string; accionTomada?: string }
  ): Observable<Reporte> {
    return this.http.put<Reporte>(`${this.API_ADMIN}/${id}`, data);
  }
}