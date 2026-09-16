// src/app/core/services/bloqueo.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bloqueo {
  id: number;
  usuarioBloqueadorId: number;
  usuarioBloqueadorNombre: string;
  usuarioBloqueadoId: number;
  usuarioBloqueadoNombre: string;
  tipo: string;
  motivo: string;
  fechaCreacion: string;
  activo: boolean;
}

export interface EstadoBloqueo {
  bloqueado: boolean;
  bloqueoId?: number;
  motivo?: string;
  fechaBloqueo?: string;
}

@Injectable({ providedIn: 'root' })
export class BloqueoService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/bloqueos`;

  bloquear(usuarioId: number, motivo: string): Observable<any> {
    return this.http.post<any>(this.baseUrl, {
      usuarioBloqueadoId: usuarioId,
      motivo: motivo || 'Sin motivo especificado'
    });
  }

  desbloquear(usuarioId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${usuarioId}`);
  }

  verificarEstado(usuarioId: number): Observable<EstadoBloqueo> {
    return this.http.get<EstadoBloqueo>(`${this.baseUrl}/estado/${usuarioId}`);
  }

  listarBloqueados(): Observable<Bloqueo[]> {
    return this.http.get<Bloqueo[]>(this.baseUrl);
  }
}