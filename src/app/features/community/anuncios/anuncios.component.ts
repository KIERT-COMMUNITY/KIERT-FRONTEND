// src/app/features/anuncios/anuncios.component.ts
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import { PullToRefreshDirective } from '../../../shared/directives/pull-to-refresh.directive';

@Component({
  selector: 'kiert-anuncios',
  standalone: true,
  imports: [CommonModule, AvisoLoginComponent, PullToRefreshDirective],
  templateUrl: './anuncios.component.html',
  styleUrl: './anuncios.component.scss'
})
export class AnunciosComponent implements OnInit, OnDestroy {
  private anuncioService = inject(AnuncioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  anuncios = signal<Anuncio[]>([]);
  anunciosFlotantes = signal<Anuncio[]>([]);
  indiceCarrusel = signal(0);
  cargando = signal(true);
  mostrarBanner = signal(true);
  intervalo: ReturnType<typeof setInterval> | null = null;

  // Pull-to-Refresh
  isRefreshing = signal(false);
  pullDistance = signal(0);
  pullOpacity = signal(0);

  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para interactuar con los anuncios.');

  // Swipe (mobile)
  private touchStartX = 0;
  private touchStartY = 0;
  private touchDeltaX = 0;
  private touchDeltaY = 0;
  private touchActivo = false;
  private readonly SWIPE_UMBRAL = 50;

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  get totalFlotantes(): number {
    return this.anunciosFlotantes().length;
  }

  ngOnInit(): void {
    this.cargarAnuncios();
    this.cargarFlotantes();
  }

  ngOnDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  recargarAnuncios(): void {
    this.isRefreshing.set(true);
    setTimeout(() => {
      this.cargarAnuncios();
      this.cargarFlotantes();
      this.finishRefresh();
    }, 1000);
  }

  private finishRefresh(): void {
    this.isRefreshing.set(false);
    this.pullDistance.set(0);
    this.pullOpacity.set(0);
  }

  cargarAnuncios(): void {
    this.cargando.set(true);
    this.anuncioService.listarPublicos().subscribe({
      next: (data) => {
        this.anuncios.set(data || []);
        this.cargando.set(false);
      },
      error: () => {
        this.anuncios.set([]);
        this.cargando.set(false);
      }
    });
  }

  // ============================================================
  // FLOTANTES: usar SOLO endpoint publico. Nunca listarTodos().
  // ============================================================
  cargarFlotantes(): void {
    this.anuncioService.listarPublicos().subscribe({
      next: (data) => {
        const flotantes = (data || []).filter(a => a.esFlotante && a.activo !== false);
        this.anunciosFlotantes.set(flotantes);
        this.indiceCarrusel.set(0);

        if (flotantes.length > 0) {
          this.iniciarCarrusel();
        }
      },
      error: () => {
        this.anunciosFlotantes.set([]);
      }
    });
  }

  iniciarCarrusel(): void {
    if (this.intervalo) clearInterval(this.intervalo);

    this.intervalo = setInterval(() => {
      const total = this.anunciosFlotantes().length;
      if (total <= 1) return;

      this.indiceCarrusel.update(i => (i + 1) % total);
    }, 5000);
  }

  get bannerActual(): Anuncio | null {
    const flotantes = this.anunciosFlotantes();
    if (flotantes.length === 0) return null;
    return flotantes[this.indiceCarrusel()];
  }

  siguienteFlotante(): void {
    const total = this.anunciosFlotantes().length;
    if (total <= 1) return;
    this.indiceCarrusel.update(i => (i + 1) % total);
    this.reiniciarAutoavance();
  }

  anteriorFlotante(): void {
    const total = this.anunciosFlotantes().length;
    if (total <= 1) return;
    this.indiceCarrusel.update(i => (i - 1 + total) % total);
    this.reiniciarAutoavance();
  }

  private reiniciarAutoavance(): void {
    if (this.anunciosFlotantes().length > 1) {
      this.iniciarCarrusel();
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (this.anunciosFlotantes().length <= 1) return;
    const t = event.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchDeltaX = 0;
    this.touchDeltaY = 0;
    this.touchActivo = true;
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.touchActivo) return;
    const t = event.touches[0];
    this.touchDeltaX = t.clientX - this.touchStartX;
    this.touchDeltaY = t.clientY - this.touchStartY;
  }

  onTouchEnd(): void {
    if (!this.touchActivo) return;
    this.touchActivo = false;

    const dx = this.touchDeltaX;
    const dy = this.touchDeltaY;

    if (Math.abs(dx) < this.SWIPE_UMBRAL) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) {
      this.siguienteFlotante();
    } else {
      this.anteriorFlotante();
    }

    this.touchDeltaX = 0;
    this.touchDeltaY = 0;
  }

  cerrarBanner(): void {
    this.mostrarBanner.set(false);
    if (this.intervalo) clearInterval(this.intervalo);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  onAccionRequiereLogin(mensaje: string): void {
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set(mensaje);
      this.mostrarAvisoLogin.set(true);
      return;
    }
  }
}