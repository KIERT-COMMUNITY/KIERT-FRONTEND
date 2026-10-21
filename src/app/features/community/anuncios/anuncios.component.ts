// src/app/features/anuncios/anuncios.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';

@Component({
  selector: 'kiert-anuncios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anuncios.component.html',
  styleUrl: './anuncios.component.scss'
})
export class AnunciosComponent implements OnInit {
  private anuncioService = inject(AnuncioService);

  anuncios = signal<Anuncio[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.anuncioService.listarPublicos().subscribe({
      next: (data) => {
        this.anuncios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.anuncios.set([]);
        this.cargando.set(false);
      }
    });
  }
}