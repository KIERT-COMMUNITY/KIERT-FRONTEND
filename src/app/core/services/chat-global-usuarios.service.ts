// src/app/core/services/chat-global-usuarios.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MensajeGlobalUsuario {
  id: number;
  contenido: string;
  fechaEnvio: string;
  emisorId: number;
  emisorNombre: string;
  emisorFoto: string | null;
  emisorMarcoId?: string | null;
  propio: boolean;
  tipoMensaje?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatGlobalUsuariosService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/chat/global-usuarios`;

  listarMensajes(desdeId?: number): Observable<MensajeGlobalUsuario[]> {
    const url = desdeId
      ? `${this.base}/mensajes?desdeId=${desdeId}`
      : `${this.base}/mensajes`;
    return this.http.get<MensajeGlobalUsuario[]>(url);
  }

  enviarMensaje(contenido: string): Observable<MensajeGlobalUsuario> {
    return this.http.post<MensajeGlobalUsuario>(`${this.base}/mensajes`, { contenido });
  }
}