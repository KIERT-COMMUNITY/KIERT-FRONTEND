// src/app/app.component.ts
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { PresenciaService } from './core/services/presencia.service';
import { AuthService } from './core/services/auth.service';

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

  private suscripcion: Subscription | null = null;

  ngOnInit(): void {
    console.log('🚀 AppComponent: ngOnInit');

    this.suscripcion = this.auth.sesionCambiada$.subscribe((autenticado) => {
      console.log('🔄 AppComponent: sesión cambió →', autenticado);

      if (autenticado) {
        // ✅ ESPERAR a que el token esté 100% guardado en localStorage
        setTimeout(() => {
          console.log('💓 Iniciando presencia DESPUÉS del login');
          this.presencia.iniciar();
        }, 500);
      } else {
        this.presencia.detener();
      }
    });

    if (this.auth.isAuthenticated()) {
      console.log('✅ AppComponent: sesión activa al arrancar');
      setTimeout(() => this.presencia.iniciar(), 500);
    }
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    try { this.presencia.detener(); } catch {}
  }
}