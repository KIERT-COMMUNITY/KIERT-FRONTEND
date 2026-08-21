import { Component, input, output, inject, OnInit } from '@angular/core';
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
export class PostCardComponent implements OnInit {
  private personalizacionStore = inject(PersonalizacionStore);
  
  post = input.required<Post>();
  postClick = output<number>();

  get temaClase(): string {
    return 'tema-' + this.personalizacionStore.temaId();
  }

  // ✅ MÉTODO PARA OBTENER LA CATEGORÍA FORMATEADA
  getCategoriaFormateada(categoria: string): string {
    if (!categoria) return 'Sin categoría';
    const categoriaLimpia = categoria.replace(/-/g, ' ');
    return categoriaLimpia
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  // ✅ MÉTODO PARA OBTENER EL COLOR DE LA CATEGORÍA
  getColorCategoria(categoria: string): string {
    if (!categoria) return '#8b98a5';
    const categoriaLower = categoria.toLowerCase();
    if (categoriaLower.includes('hacking') || categoriaLower.includes('seguridad') || categoriaLower.includes('ciber')) {
      return '#ff6b6b';
    }
    if (categoriaLower.includes('ayuda') || categoriaLower.includes('emergencia') || categoriaLower.includes('socorro')) {
      return '#feca57';
    }
    if (categoriaLower.includes('historia') || categoriaLower.includes('experiencia') || categoriaLower.includes('caso')) {
      return '#55efc4';
    }
    if (categoriaLower.includes('programacion') || categoriaLower.includes('codigo') || categoriaLower.includes('desarrollo')) {
      return '#0984e3';
    }
    if (categoriaLower.includes('redes') || categoriaLower.includes('network') || categoriaLower.includes('infraestructura')) {
      return '#6c5ce7';
    }
    if (categoriaLower.includes('ia') || categoriaLower.includes('inteligencia') || categoriaLower.includes('machine')) {
      return '#fd79a8';
    }
    return '#2dd4bf';
  }

  // ✅ OBTENER EL MARCO DEL AUTOR
  getMarcoDelAutor(): string {
    return this.post().autor?.marcoId || 'none';
  }

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

  // ========== DETECCIÓN DE TIPOS DE ARCHIVO ==========
  esImagen(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
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

  obtenerPrimerVisual(): Adjunto | null {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return null;
    const imagen = adjuntos.find(a => this.esImagen(a));
    if (imagen) return imagen;
    const video = adjuntos.find(a => this.esVideo(a));
    if (video) return video;
    const gif = adjuntos.find(a => this.esGif(a));
    if (gif) return gif;
    return null;
  }

  cantidadVisuales(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => this.esImagen(a) || this.esVideo(a) || this.esGif(a)).length;
  }

  tieneVisuales(): boolean {
    return this.cantidadVisuales() > 0;
  }

  cantidadOtrosAdjuntos(): number {
    const adjuntos = this.post().adjuntos;
    if (!adjuntos || adjuntos.length === 0) return 0;
    return adjuntos.filter(a => this.esArchivo(a)).length;
  }

  tieneOtrosAdjuntos(): boolean {
    return this.cantidadOtrosAdjuntos() > 0;
  }

  tieneAdjuntos(): boolean {
    const adjuntos = this.post().adjuntos;
    return adjuntos && adjuntos.length > 0;
  }

  getIconoArchivo(adjunto: Adjunto): string {
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (nombre.endsWith('.pdf')) return '📄';
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return '📝';
    if (nombre.endsWith('.xls') || nombre.endsWith('.xlsx')) return '📊';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar') || nombre.endsWith('.7z')) return '📦';
    if (nombre.endsWith('.txt')) return '📃';
    return '📎';
  }

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

  ngOnInit(): void {
    console.log('📌 PostCard - Marco del autor:', this.getMarcoDelAutor());
  }
}