import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Post, Adjunto } from '../../../core/models/post.model';
import { AvatarFrameComponent } from '../avatar-frame/avatar-frame.component';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { FormatDurationPipe } from '../../pipes/format.pipe';

@Component({
  selector: 'kiert-post-card',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    AvatarFrameComponent,
    FormatDurationPipe
  ],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  private personalizacionStore = inject(PersonalizacionStore);
  
  post = input.required<Post>();
  postClick = output<number>();

  get temaClase(): string {
    return 'tema-' + this.personalizacionStore.temaId();
  }

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

  // ========== DETECCIÓN DE TIPOS DE ARCHIVO (CORREGIDO) ==========
  
  esImagen(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    
    // ✅ Soporte para todos los tipos de imagen
    if (tipo === 'imagen' || tipo === 'image') return true;
    if (tipo === 'archivo' || tipo === 'file') {
      const extensiones = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
      return extensiones.some(ext => nombre.endsWith(ext));
    }
    return false;
  }

  esVideo(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    
    if (tipo === 'video') return true;
    if (tipo === 'archivo' || tipo === 'file') {
      const extensiones = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.m4v', '.3gp'];
      return extensiones.some(ext => nombre.endsWith(ext));
    }
    return false;
  }

  esGif(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    
    if (tipo === 'gif') return true;
    if (tipo === 'archivo' || tipo === 'file') {
      return nombre.endsWith('.gif');
    }
    return false;
  }

  esArchivo(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    return !this.esImagen(adjunto) && !this.esVideo(adjunto) && !this.esGif(adjunto);
  }

  // ========== OBTENER EL PRIMER ARCHIVO VISUAL ==========
  obtenerPrimerVisual(): Adjunto | null {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) {
      console.log('📎 No hay adjuntos en este post');
      return null;
    }
    
    console.log('📎 Adjuntos disponibles:', adjuntos.length);
    adjuntos.forEach(a => console.log('📎 Adjunto:', a.tipo, a.nombre, a.url));
    
    // Buscar primero imagen, luego video, luego gif
    const imagen = adjuntos.find(a => this.esImagen(a));
    if (imagen) {
      console.log('🖼️ Encontrada imagen:', imagen.url);
      return imagen;
    }
    
    const video = adjuntos.find(a => this.esVideo(a));
    if (video) {
      console.log('🎥 Encontrado video:', video.url);
      return video;
    }
    
    const gif = adjuntos.find(a => this.esGif(a));
    if (gif) {
      console.log('🎬 Encontrado GIF:', gif.url);
      return gif;
    }
    
    console.log('📎 No se encontraron archivos visuales');
    return null;
  }

  // ========== CONTAR ARCHIVOS VISUALES ==========
  cantidadVisuales(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => this.esImagen(a) || this.esVideo(a) || this.esGif(a)).length;
  }

  tieneVisuales(): boolean {
    return this.cantidadVisuales() > 0;
  }

  // ========== CONTAR OTROS ADJUNTOS ==========
  cantidadOtrosAdjuntos(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => this.esArchivo(a)).length;
  }

  tieneOtrosAdjuntos(): boolean {
    return this.cantidadOtrosAdjuntos() > 0;
  }

  // ========== VERIFICAR SI TIENE ADJUNTOS EN GENERAL ==========
  tieneAdjuntos(): boolean {
    const adjuntos = this.post().adjuntos;
    return adjuntos && adjuntos.length > 0;
  }

  // ========== OBTENER ICONO PARA ARCHIVO ==========
  getIconoArchivo(adjunto: Adjunto): string {
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (nombre.endsWith('.pdf')) return '📄';
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return '📝';
    if (nombre.endsWith('.xls') || nombre.endsWith('.xlsx')) return '📊';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar') || nombre.endsWith('.7z')) return '📦';
    if (nombre.endsWith('.txt')) return '📃';
    return '📎';
  }

  // ========== MANEJO DE ERRORES ==========
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%235a6a7a" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
    img.alt = 'Imagen no disponible';
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.style.display = 'none';
    const parent = video.parentElement;
    if (parent) {
      const errorMsg = document.createElement('div');
      errorMsg.className = 'post-card__video-error';
      errorMsg.textContent = '❌ Video no disponible';
      parent.appendChild(errorMsg);
    }
  }

  onClick(): void {
    const postId = this.post().id;
    if (postId && !isNaN(postId) && postId > 0) {
      this.postClick.emit(postId);
    }
  }
}