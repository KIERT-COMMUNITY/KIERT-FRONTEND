// src/app/features/anuncios/anuncios.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';

@Component({
  selector: 'kiert-anuncios',
  standalone: true,
  imports: [CommonModule,],
  templateUrl: './anuncios.component.html',
  styleUrl: './anuncios.component.scss'
})
export class AnunciosComponent implements OnInit {
  private anuncioService = inject(AnuncioService);

  anuncios = signal<Anuncio[]>([]);
  anuncioFlotante = signal<Anuncio | null>(null); // ✅ Separado
  cargando = signal(true);
  mostrarBanner = signal(true);

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
      error: () => {
        this.anuncios.set([]);
        this.cargando.set(false);
      }
    });
  }

  // ✅ Cargar solo el anuncio flotante
  cargarFlotante(): void {
    this.anuncioService.obtenerFlotante().subscribe({
      next: (data) => {
        if (data) this.anuncioFlotante.set(data);
      },
      error: () => this.anuncioFlotante.set(null)
    });
  }

  cerrarBanner(): void {
    this.mostrarBanner.set(false);
  }
}