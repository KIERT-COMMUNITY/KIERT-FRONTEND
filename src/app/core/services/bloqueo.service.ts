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
  bloqueoId: number | null;
  motivo: string | null;
  fechaBloqueo: string | null;
}

export interface CrearBloqueo {
  usuarioBloqueadoId: number;
  motivo: string;
}

@Injectable({ providedIn: 'root' })
export class BloqueoService {
  private readonly baseUrl = `${environment.apiUrl}/bloqueos`;
  private http = inject(HttpClient);

  bloquear(dto: CrearBloqueo): Observable<any> {
    return this.http.post(this.baseUrl, dto);
  }

  desbloquear(usuarioId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${usuarioId}`);
  }

  verificarEstado(usuarioId: number): Observable<EstadoBloqueo> {
    return this.http.get<EstadoBloqueo>(`${this.baseUrl}/estado/${usuarioId}`);
  }

  listarBloqueados(): Observable<Bloqueo[]> {
    return this.http.get<Bloqueo[]>(this.baseUrl);
  }
}