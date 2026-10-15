// src/app/app.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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

  ngOnInit(): void {
    console.log('[APP] AppComponent: ngOnInit');

    // ============================================================
    // Suscribirse a cambios de sesión de usuario normal
    // ============================================================
    this.suscripcion = this.auth.sesionCambiada$.subscribe((autenticado) => {
      console.log('[APP] Sesión usuario cambió →', autenticado);

      if (autenticado) {
        // Esperar a que el token esté en localStorage
        setTimeout(() => {
          console.log('[APP] Iniciando presencia (usuario normal)');
          this.presencia.iniciar();
        }, 500);
      } else {
        // ✅ SOLO detener presencia si NO hay sesión admin
        const hayAdmin = this.adminAuth.estaLogueado();

        if (!hayAdmin) {
          console.log('[APP] Sin sesiones activas, deteniendo presencia');
          this.presencia.detener();
        } else {
          console.log('[APP] Hay sesión admin, manteniendo presencia');
        }
      }
    });

    // ============================================================
    // Sesión ya activa al arrancar la app
    // ============================================================
    if (this.auth.isAuthenticated()) {
      console.log('[APP] Sesión de usuario ya activa al arrancar');
      setTimeout(() => this.presencia.iniciar(), 500);
    } else if (this.adminAuth.estaLogueado()) {
      console.log('[APP] Solo sesión admin al arrancar');
      // Opcional: iniciar presencia si el backend lo permite con token admin
      // setTimeout(() => this.presencia.iniciar(), 500);
    }
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    try {
      this.presencia.detener();
    } catch {
      // sin problema
    }
  }
}