// post-card.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router'; // ✅ Añadir RouterLink
import { Post, Adjunto } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink], // ✅ Añadir RouterLink
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  post = input.required<Post>();
  postClick = output<number>();

  // ... resto del código igual


  etiquetas: Record<Post['categoria'], string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };

  formatearFecha(fecha: string): string {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} h`;
    if (dias < 7) return `Hace ${dias} d`;
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  esImagen(adjunto: Adjunto): boolean {
    if (adjunto.tipo !== 'archivo') return false;
    const nombre = adjunto.nombre.toLowerCase();
    // Soporte para TODOS los formatos de imagen
    const extensiones = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', 
      '.bmp', '.svg', '.tiff', '.tif', '.ico', 
      '.heic', '.heif', '.avif', '.jfif', '.pjpeg',
      '.pjp', '.jxl', '.apng', '.avifs'
    ];
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

  tieneAdjuntos(): boolean {
    const adjuntos = this.post().adjuntos;
    return adjuntos && adjuntos.length > 0;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%235a6a7a" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
    img.alt = 'Imagen no disponible';
  }

  onClick(): void {
    const postId = this.post().id;
    if (postId && !isNaN(postId) && postId > 0) {
      this.postClick.emit(postId);
    }
  }
}