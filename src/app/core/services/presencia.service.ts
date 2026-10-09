// src/app/core/services/presencia.service.ts
import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PresenciaService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);

  private heartbeatInterval: any = null;
  private readonly API = `${environment.apiUrl}/presencia`;
  private readonly TOKEN_KEY = 'token';
  private readonly INTERVALO_MS = 60_000;

  iniciar(): void {
    if (!this.hayToken()) {
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
    if (!this.hayToken()) return;
    console.log('🔴 Presencia: marcando offline');
    this.http.post(`${this.API}/offline`, {}).subscribe({
      next: () => {},
      error: (e) => console.warn('Error offline:', e)
    });
  }

  private hayToken(): boolean {
    try { return !!localStorage.getItem(this.TOKEN_KEY); }
    catch { return false; }
  }

  private enviarHeartbeat(): void {
    if (!this.hayToken()) {
      console.warn('⚠️ Heartbeat: no hay token, se omite');
      return;
    }

    // ✅ DEBUG: verificar que el token está presente
    const token = localStorage.getItem(this.TOKEN_KEY);
    console.log('💓 Presencia: enviando heartbeat con token:', token?.substring(0, 20) + '...');

    this.http.post(`${this.API}/heartbeat`, {}).subscribe({
      next: () => console.log('✅ Presencia: heartbeat OK'),
      error: (e) => {
        console.warn('❌ Presencia: error heartbeat', e.status, e.message);
        // Si es 401, el interceptor ya se encargará
      }
    });
  }

  private onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.enviarHeartbeat();
  };

  private onBeforeUnload = (): void => {
    // ⚠️ sendBeacon NO pasa por el interceptor, así que no envía el token.
    // En su lugar, usamos una petición síncrona al marcarOffline.
    try {
      this.marcarOffline();
    } catch {}
  };
}