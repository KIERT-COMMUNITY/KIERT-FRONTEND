// post-card.component.ts -> tarjeta que representa UNA publicación resumida.
// Se usa dentro del feed (lista) recibiendo el post como @Input().
// Es "tonto" a propósito: no pide datos, solo MUESTRA lo que le pasan (fácil de reutilizar).
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
  // input(): forma moderna (Angular 17+) de declarar un @Input(), como signal
  post = input.required<Post>();

  // Diccionario para mostrar una etiqueta legible según la categoría
  etiquetas: Record<Post['categoria'], string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };

  // ✅ Método para verificar si un adjunto es una imagen
  esImagen(adjunto: Adjunto): boolean {
    if (adjunto.tipo !== 'archivo') return false;
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const nombre = adjunto.nombre.toLowerCase();
    return extensiones.some(ext => nombre.endsWith(ext));
  }

  // ✅ Obtener la primera imagen del post (si existe)
  obtenerPrimeraImagen(): Adjunto | null {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return null;
    
    // Buscar la primera imagen
    const imagen = adjuntos.find(a => this.esImagen(a));
    return imagen || null;
  }

  // ✅ Verificar si el post tiene imágenes
  tieneImagenes(): boolean {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return false;
    return adjuntos.some(a => this.esImagen(a));
  }

  // ✅ Obtener el número de archivos adjuntos que NO son imágenes
  getOtrosAdjuntos(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => !this.esImagen(a)).length;
  }

  // ✅ Verificar si hay adjuntos (imágenes u otros)
  tieneAdjuntos(): boolean {
    const adjuntos = this.post().adjuntos;
    return adjuntos && adjuntos.length > 0;
  }

  // ✅ Manejar error de carga de imagen
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/400x200?text=Imagen+no+disponible';
    img.alt = 'Imagen no disponible';
  }
}