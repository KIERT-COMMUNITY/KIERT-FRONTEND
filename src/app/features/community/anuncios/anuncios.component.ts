import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';

@Component({
  selector: 'kiert-anuncios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anuncios.component.html',
  styleUrl: './anuncios.component.scss'
})
export class AnunciosComponent implements OnInit, OnDestroy {
  private anuncioService = inject(AnuncioService);

  anuncios = signal<Anuncio[]>([]);
  cargando = signal(true);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.cargar();
    this.intervalId = setInterval(() => this.cargar(), 30000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  cargar(): void {
    this.anuncioService.listarPublicos().subscribe({
      next: (data) => {
        this.anuncios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }
}