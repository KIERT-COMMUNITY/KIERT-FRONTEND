// post-detail.component.ts - CORREGIDO
import { Component, OnInit, input, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';  // ✅ Solo Router, no RouterLink
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post, Comentario, Adjunto } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-detail',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],  // ✅ Eliminar RouterLink
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
})
export class PostDetailComponent implements OnInit {
  private postService = inject(PostService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);  // ✅ Inyectar Router

  id = input.required<string>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  errorMsg = signal<string | null>(null);
  estaLogueado = signal<boolean>(false);

  etiquetas: Record<string, string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };

  formComentario = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]],
  });

  ngOnInit(): void {
    this.estaLogueado.set(this.authService.isAuthenticated());
    const postId = Number(this.id());
    
    console.log('🔍 PostDetailComponent: ID recibido:', postId);
    
    if (!postId || isNaN(postId)) {
      this.errorMsg.set('ID de publicación inválido');
      this.cargando.set(false);
      return;
    }
    
    this.cargarPost(postId);
    this.cargarComentarios(postId);
  }

  cargarPost(postId: number): void {
    this.cargando.set(true);
    console.log('📤 Cargando post ID:', postId);
    
    this.postService.obtenerPorId(postId).subscribe({
      next: (data) => {
        console.log('✅ Post cargado:', data);
        this.post.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('❌ Error al cargar post:', error);
        this.cargando.set(false);
        
        if (error.status === 404) {
          this.errorMsg.set('Esta publicación no existe o fue eliminada.');
        } else if (error.status === 500) {
          this.errorMsg.set('Error del servidor. Intenta nuevamente.');
        } else {
          this.errorMsg.set('Error al cargar la publicación');
        }
      }
    });
  }

  cargarComentarios(postId: number): void {
    this.postService.listarComentarios(postId).subscribe({
      next: (data) => {
        this.comentarios.set(data);
      },
      error: (error) => {
        console.error('Error al cargar comentarios:', error);
      }
    });
  }

  enviarComentario(): void {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Debes iniciar sesion para comentar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.enviandoComentario.set(true);
    const contenido = this.formComentario.getRawValue().contenido!;

    this.postService.comentar(Number(this.id()), contenido).subscribe({
      next: (nuevo) => {
        this.comentarios.update((lista) => [...lista, nuevo]);
        this.formComentario.reset();
        this.enviandoComentario.set(false);
      },
      error: (error) => {
        console.error('Error al enviar comentario:', error);
        this.errorMsg.set('Error al enviar comentario');
        this.enviandoComentario.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
    });
  }

  volverAlFeed(): void {
    this.router.navigate(['/comunidad']);
  }

  esImagen(adjunto: Adjunto): boolean {
    if (adjunto.tipo !== 'archivo') return false;
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const nombre = adjunto.nombre.toLowerCase();
    return extensiones.some(ext => nombre.endsWith(ext));
  }

  obtenerImagenes(): Adjunto[] {
    const adjuntos = this.post()?.adjuntos || [];
    return adjuntos.filter(a => this.esImagen(a));
  }

  obtenerOtrosAdjuntos(): Adjunto[] {
    const adjuntos = this.post()?.adjuntos || [];
    return adjuntos.filter(a => !this.esImagen(a));
  }

  cantidadImagenes(): number {
    return this.obtenerImagenes().length;
  }

  tieneImagenes(): boolean {
    return this.cantidadImagenes() > 0;
  }

  tieneOtrosAdjuntos(): boolean {
    return this.obtenerOtrosAdjuntos().length > 0;
  }

  tieneAdjuntos(): boolean {
    const adjuntos = this.post()?.adjuntos || [];
    return adjuntos.length > 0;
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

  abrirImagen(url: string): void {
    window.open(url, '_blank');
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%235a6a7a" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
    img.alt = 'Imagen no disponible';
  }

  getInicialUsuario(): string {
    const usuario = this.authService.usuario();
    return usuario?.nombreUsuario?.charAt(0)?.toUpperCase() || '?';
  }
  onAvatarError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
  // Mostrar la inicial como fallback
  const parent = img.parentElement;
  if (parent) {
    const inicial = document.createElement('span');
    inicial.className = 'avatar-inicial';
    const nombre = this.post()?.autor?.nombreUsuario || '?';
    inicial.textContent = nombre.charAt(0).toUpperCase();
    parent.appendChild(inicial);
  }
}
}