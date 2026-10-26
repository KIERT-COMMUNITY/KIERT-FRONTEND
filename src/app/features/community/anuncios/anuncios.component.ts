// src/app/features/anuncios/anuncios.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-anuncios',
  standalone: true,
  imports: [CommonModule, AvisoLoginComponent],
  templateUrl: './anuncios.component.html',
  styleUrl: './anuncios.component.scss'
})
export class AnunciosComponent implements OnInit {
  private anuncioService = inject(AnuncioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  anuncios = signal<Anuncio[]>([]);
  anuncioFlotante = signal<Anuncio | null>(null);
  cargando = signal(true);
  mostrarBanner = signal(true);

  // ✅ AVISO LOGIN
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para interactuar con los anuncios.');

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  ngOnInit(): void {
    this.cargarAnuncios();
    this.cargarFlotante();
  }

  cargarAnuncios(): void {
    this.cargando.set(true);
    this.anuncioService.listarPublicos().subscribe({
      next: (data) => {
        this.anuncios.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('[ANUNCIOS] Error al cargar anuncios:', err);
        this.anuncios.set([]);
        this.cargando.set(false);
      }
    });
  }

  cargarFlotante(): void {
    this.anuncioService.obtenerFlotante().subscribe({
      next: (data) => {
        if (data) this.anuncioFlotante.set(data);
        else this.anuncioFlotante.set(null);
      },
      error: () => this.anuncioFlotante.set(null)
    });
  }

  cerrarBanner(): void {
    this.mostrarBanner.set(false);
  }

  // ✅ Ir al login
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  // ✅ Método genérico para futuras acciones que requieran login
  onAccionRequiereLogin(mensaje: string): void {
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set(mensaje);
      this.mostrarAvisoLogin.set(true);
      return;
    }
    // Aquí iría la acción real si estuviera logueado
  }
}