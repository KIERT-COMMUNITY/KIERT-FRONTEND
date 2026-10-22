// src/app/core/services/presencia.service.ts
import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { AdminAuthService } from './admin-auth.service';

@Injectable({ providedIn: 'root' })
export class PresenciaService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private authService = inject(AuthService);
  private adminAuth = inject(AdminAuthService);

  private heartbeatInterval: any = null;
  private readonly API = `${environment.apiUrl}/presencia`;
  private readonly INTERVALO_MS = 60_000;

  iniciar(): void {
    // ✅ Usa AuthService.getToken() → devuelve el token activo (admin o normal) de ESTA pestaña
    const token = this.authService.getToken();

    if (!token) {
      console.warn('⚠️ Presencia: no hay token, no se inicia');
      return;
    }
    if (this.heartbeatInterval) {
      console.log('ℹ️ Presencia: ya estaba iniciada');
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
    if (!this.authService.getToken()) return;
    console.log('🔴 Presencia: marcando offline');
    this.http.post(`${this.API}/offline`, {}).subscribe({
      next: () => {},
      error: (e) => console.warn('Error offline:', e)
    });
  }

  private enviarHeartbeat(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('⚠️ Heartbeat: no hay token, se omite');
      return;
    }

    // El interceptor añade Authorization automáticamente
    this.http.post(`${this.API}/heartbeat`, {}).subscribe({
      next: () => console.log('✅ Presencia: heartbeat OK'),
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
}