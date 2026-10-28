// src/app/features/community/post-card/post-card.component.ts
import { Component, Input, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Post, Adjunto } from '../../../core/models/post.model';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { PostsOcultosService } from '../../../core/services/posts-ocultos.service';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';

@Component({
  selector: 'kiert-post-card',
  standalone: true,
  imports: [CommonModule, RouterLink, AvatarFrameComponent],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss'
})
export class PostCardComponent {
  private router = inject(Router);
  private personalizacionStore = inject(PersonalizacionStore);
  private postsOcultos = inject(PostsOcultosService);

  @Input({ required: true }) post!: Post;

  // ===== ESTADO DEL MENÚ =====
  mostrarMenu = signal(false);

  get temaClase(): string {
    return `tema-${this.personalizacionStore.temaId()}`;
  }

  get estaOculto(): boolean {
    return this.postsOcultos.estaOculto(this.post.id);
  }

  // ===== HELPERS EXISTENTES =====
  esAnonimo(): boolean {
    return !this.post?.autor || !this.post.autor.id;
  }

  getMarcoDelAutor(): string {
    if (this.esAnonimo()) return 'none';
    return this.post.autor.marcoId || 'none';
  }

  getCategoriaFormateada(categoria: string | undefined): string {
    if (!categoria) return 'General';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1).replace(/-/g, ' ');
  }

  getColorCategoria(categoria: string | undefined): string {
    if (!categoria) return '#8b98a5';
    const c = categoria.toLowerCase();
    if (c.includes('hacking') || c.includes('seguridad')) return '#ff6b6b';
    if (c.includes('ayuda')) return '#feca57';
    if (c.includes('programacion')) return '#0984e3';
    if (c.includes('redes')) return '#6c5ce7';
    if (c.includes('ia')) return '#fd79a8';
    return '#2dd4bf';
  }

  formatearFecha(fecha: string | Date | undefined): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '';

    const ahora = new Date();
    const diffMs = ahora.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffH < 24) return `Hace ${diffH} h`;
    if (diffD < 7) return `Hace ${diffD} d`;

    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ===== ADJUNTOS =====
  esVideo(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (tipo === 'video') return true;
    return ['.mp4', '.webm', '.ogg', '.mov', '.mkv'].some(e => nombre.endsWith(e));
  }

  esGif(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const nombre = adjunto.nombre?.toLowerCase() || '';
    const url = adjunto.url?.toLowerCase() || '';
    return nombre.endsWith('.gif') || url.endsWith('.gif') || adjunto.tipo === 'gif';
  }

  esArchivo(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    if (this.esVideo(adjunto) || this.esGif(adjunto)) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (tipo === 'imagen' || tipo === 'image') {
      return !['.jpg', '.jpeg', '.png', '.gif', '.webp'].some(e => nombre.endsWith(e));
    }
    return true;
  }

  tieneVisuales(): boolean {
    return (this.post?.adjuntos || []).some(a => this.esVideo(a) || this.esGif(a) || this.esImagen(a));
  }

  cantidadVisuales(): number {
    return (this.post?.adjuntos || []).filter(a => this.esVideo(a) || this.esGif(a) || this.esImagen(a)).length;
  }

  esImagen(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (tipo === 'imagen' || tipo === 'image') {
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some(e => nombre.endsWith(e));
    }
    return false;
  }

  obtenerPrimerVisual(): Adjunto | null {
    const visuales = (this.post?.adjuntos || []).filter(a => this.esVideo(a) || this.esGif(a) || this.esImagen(a));
    return visuales.length > 0 ? visuales[0] : null;
  }

  tieneAdjuntos(): boolean {
    return (this.post?.adjuntos || []).length > 0;
  }

  tieneOtrosAdjuntos(): boolean {
    return (this.post?.adjuntos || []).some(a => this.esArchivo(a));
  }

  getIconoArchivo(adjunto: Adjunto): string {
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (nombre.endsWith('.pdf')) return 'PDF';
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return 'DOC';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar')) return 'ZIP';
    if (nombre.endsWith('.txt')) return 'TXT';
    return 'ARCH';
  }

  // ===== IMÁGENES / VIDEOS =====
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  onVideoError(event: Event): void {
    const video = event.target as HTMLVideoElement;
    video.style.display = 'none';
  }

  // ===== CLICK EN TARJETA =====
  onClick(): void {
    if (this.mostrarMenu()) return;
    this.router.navigate(['/comunidad', this.post.id]);
  }

  // ===== MENÚ =====
  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.mostrarMenu.update(v => !v);
  }

  cerrarMenu(): void {
    this.mostrarMenu.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.mostrarMenu()) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.post-card__menu-wrapper')) {
      this.cerrarMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mostrarMenu()) this.cerrarMenu();
  }

  // ===== OCULTAR =====
  ocultarPost(motivo: 'sensible' | 'no-interesa' | 'otro', event: Event): void {
    event.stopPropagation();
    this.postsOcultos.ocultar(this.post.id, motivo);
    this.cerrarMenu();
  }

  /** Emite el post oculto al padre para que lo quite de la lista */
  get postId(): number {
    return this.post.id;
  }

  get estaGuardado(): boolean {
    return this.estaOculto;
  }
}