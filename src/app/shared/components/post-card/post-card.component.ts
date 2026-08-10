// post-card.component.ts
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Post, Adjunto } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-card',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  post = input.required<Post>();

  // ✅ Sin emojis - etiquetas simples
  etiquetas: Record<Post['categoria'], string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };

  esImagen(adjunto: Adjunto): boolean {
    if (adjunto.tipo !== 'archivo') return false;
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const nombre = adjunto.nombre.toLowerCase();
    return extensiones.some(ext => nombre.endsWith(ext));
  }

  obtenerPrimeraImagen(): Adjunto | null {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return null;
    const imagen = adjuntos.find(a => this.esImagen(a));
    return imagen || null;
  }

  cantidadImagenes(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => this.esImagen(a)).length;
  }

  tieneImagenes(): boolean {
    return this.cantidadImagenes() > 0;
  }

  getOtrosAdjuntos(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => !this.esImagen(a)).length;
  }

  tieneAdjuntos(): boolean {
    const adjuntos = this.post().adjuntos;
    return adjuntos && adjuntos.length > 0;
  }

  obtenerImagenes(): Adjunto[] {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos) return [];
    return adjuntos.filter(a => this.esImagen(a));
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%23999" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
    img.alt = 'Imagen no disponible';
  }

  getIconoAdjunto(adjunto: Adjunto): string {
    if (adjunto.tipo === 'link') return 'Link';
    const nombre = adjunto.nombre.toLowerCase();
    if (nombre.endsWith('.pdf')) return 'PDF';
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return 'Documento';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar')) return 'Zip';
    if (nombre.endsWith('.txt')) return 'Texto';
    return 'Archivo';
  }

  getImagenesExtra(): number {
    const total = this.cantidadImagenes();
    return total > 1 ? total - 1 : 0;
  }
}