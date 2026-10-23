// src/app/core/services/presencia.service.ts
import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AdminAuthService } from './admin-auth.service';

export interface PresenciaUsuario {
  usuarioId: number;
  enLinea: boolean;
  ultimaConexion: string | null;
}

@Injectable({ providedIn: 'root' })
export class PresenciaService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService);
  private adminAuth = inject(AdminAuthService);

  private heartbeatInterval: any = null;
  private readonly API = `${environment.apiUrl}/presencia`;
  private readonly INTERVALO_MS = 60_000;

  private getHeaders(): HttpHeaders {
    const token = this.authService.obtenerTokenUsuario();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }

  iniciar(): void {
    this.esperarTokenYIniciar();
  }

  private esperarTokenYIniciar(): void {
    if (this.authService.obtenerTokenUsuario()) {
      this.arrancarHeartbeat();
      return;
    }

    let intentos = 0;
    const intentar = () => {
      intentos++;
      if (this.authService.obtenerTokenUsuario()) {
        this.arrancarHeartbeat();
        return;
      }
      if (intentos < 20) {
        setTimeout(intentar, 150);
      } else {
        console.warn('⚠️ Presencia: no se encontró token tras 3s, abortando');
      }
    };
    setTimeout(intentar, 100);
  }

  private arrancarHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    console.log('🟢 Presencia: iniciando heartbeat');
    this.enviarHeartbeat();

    this.ngZone.runOutsideAngular(() => {
      this.heartbeatInterval = setInterval(
        () => this.enviarHeartbeat(),
        this.INTERVALO_MS
      );
    });

    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('beforeunload', this.onBeforeUnload);
    window.addEventListener('pagehide', this.onBeforeUnload);
  }

  detener(): void {
    if (this.heartbeatInterval) {
      console.log('🔴 Presencia: deteniendo heartbeat');
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('beforeunload', this.onBeforeUnload);
    window.removeEventListener('pagehide', this.onBeforeUnload);
  }

  marcarOffline(): void {
    const token = this.authService.obtenerTokenUsuario();
    if (!token) return;
    this.http.post(`${this.API}/offline`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: () => {},
        error: (e) => console.warn('Error offline:', e)
      });
  }

  private enviarHeartbeat(): void {
    const token = this.authService.obtenerTokenUsuario();
    if (!token) {
      console.warn('⚠️ Heartbeat: no hay token, se omite');
      return;
    }

    this.http.post(`${this.API}/heartbeat`, {}, { headers: this.getHeaders() })
      .subscribe({
        next: (res: any) => {
          console.log('✅ Presencia: heartbeat OK', res);
        },
        error: (e) => {
          console.warn('❌ Presencia: error heartbeat', e.status, e.message);
        }
      });
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.enviarHeartbeat();
  };

  private onBeforeUnload = (): void => {
    try {
      this.marcarOffline();
    } catch { /* ignore */ }
  };

  obtenerPresencia(usuarioId: number): Observable<PresenciaUsuario> {
    return this.http.get<PresenciaUsuario>(
      `${this.API}/${usuarioId}`,
      { headers: this.getHeaders() }
    );
  }

  obtenerPresenciaMultiple(usuarioIds: number[]): Observable<PresenciaUsuario[]> {
    return this.http.post<PresenciaUsuario[]>(
      `${this.API}/multiple`,
      { usuarioIds },
      { headers: this.getHeaders() }
    );
  }
}