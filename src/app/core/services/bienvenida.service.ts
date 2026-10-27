// src/app/core/services/bienvenida.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bienvenida {
  titulo: string;
  contenido: string;
  fechaActualizacion: string | null;
}

@Injectable({ providedIn: 'root' })
export class BienvenidaService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bienvenida`;

  obtener(): Observable<Bienvenida> {
    return this.http.get<Bienvenida>(this.base);
  }
}