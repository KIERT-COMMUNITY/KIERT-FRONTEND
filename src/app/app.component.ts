// src/app/app.component.ts
import {
  Component, OnInit, OnDestroy, inject, isDevMode,
  ChangeDetectionStrategy
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { PresenciaService } from './core/services/presencia.service';
import { AuthService } from './core/services/auth.service';
import { AdminAuthService } from './core/services/admin-auth.service';

@Component({
  selector: 'kiert-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private presencia = inject(PresenciaService);
  private auth = inject(AuthService);
  private adminAuth = inject(AdminAuthService);

  private readonly destroy$ = new Subject<void>();
  private presenciaActiva = false;

  ngOnInit(): void {
    if (isDevMode()) console.log('[APP] AppComponent: ngOnInit');

    // Suscripcion a cambios de sesion de usuario normal
    this.auth.sesionCambiada$
      .pipe(takeUntil(this.destroy$))
      .subscribe((autenticado) => {
        if (isDevMode()) console.log('[APP] Sesion usuario cambio ->', autenticado);
        this.sincronizarPresencia();
      });

    // Suscripcion a cambios de sesion de admin (si el servicio lo expone)
    // Ajusta el nombre del observable si en tu AdminAuthService se llama distinto
    const adminSesion$ = (this.adminAuth as any).sesionCambiada$;
    if (adminSesion$ && typeof adminSesion$.subscribe === 'function') {
      adminSesion$
        .pipe(takeUntil(this.destroy$))
        .subscribe((autenticado: boolean) => {
          if (isDevMode()) console.log('[APP] Sesion admin cambio ->', autenticado);
          this.sincronizarPresencia();
        });
    }

    // Sesion ya activa al arrancar
    this.sincronizarPresencia();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    try {
      this.presencia.detener();
    } catch { /* ignore */ }
    this.presenciaActiva = false;
  }

  /**
   * Decide si presencia debe estar activa:
   *   - Usuario normal logueado O
   *   - Admin logueado
   * Solo se llama una vez por estado (evita dobles peticiones).
   */
  private sincronizarPresencia(): void {
    const hayUsuario = this.auth.isAuthenticated();
    const hayAdmin = this.adminAuth.estaLogueado();
    const debeEstarActiva = hayUsuario || hayAdmin;

    if (debeEstarActiva && !this.presenciaActiva) {
      if (isDevMode()) console.log('[APP] Iniciando presencia');
      try {
        this.presencia.iniciar();
        this.presenciaActiva = true;
      } catch (err) {
        if (isDevMode()) console.error('[APP] Error al iniciar presencia', err);
        this.presenciaActiva = false;
      }
    } else if (!debeEstarActiva && this.presenciaActiva) {
      if (isDevMode()) console.log('[APP] Deteniendo presencia');
      try {
        this.presencia.detener();
      } catch (err) {
        if (isDevMode()) console.error('[APP] Error al detener presencia', err);
      }
      this.presenciaActiva = false;
    }
  }
}