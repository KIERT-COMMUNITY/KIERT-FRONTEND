// src/app/app.component.ts
import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
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
})
export class AppComponent implements OnInit, OnDestroy {
  private presencia = inject(PresenciaService);
  private auth = inject(AuthService);
  private adminAuth = inject(AdminAuthService);

  private suscripcion: Subscription | null = null;
  private presenciaActiva = false;

  ngOnInit(): void {
    console.log('[APP] AppComponent: ngOnInit');

    // ============================================================
    // Suscribirse a cambios de sesión de usuario normal
    // ============================================================
    this.suscripcion = this.auth.sesionCambiada$.subscribe((autenticado) => {
      console.log('[APP] Sesión usuario cambió →', autenticado);
      this.sincronizarPresencia();
    });

    // ============================================================
    // Sesión ya activa al arrancar (usuario o admin)
    // ============================================================
    this.sincronizarPresencia();
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    try {
      this.presencia.detener();
    } catch { /* ignore */ }
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
      console.log('[APP] Iniciando presencia');
      this.presencia.iniciar();
      this.presenciaActiva = true;
    } else if (!debeEstarActiva && this.presenciaActiva) {
      console.log('[APP] Deteniendo presencia');
      this.presencia.detener();
      this.presenciaActiva = false;
    }
  }
}