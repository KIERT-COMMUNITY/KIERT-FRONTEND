// post-detail.component.ts
import { Component, OnInit, input, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post, Comentario, Adjunto } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-detail',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
})
export class PostDetailComponent implements OnInit {
  private postService = inject(PostService);
  public authService = inject(AuthService);
  private fb = inject(FormBuilder);

  id = input.required<string>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  errorMsg = signal<string | null>(null);
  estaLogueado = signal<boolean>(false);

  // ✅ Sin emojis
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
    this.estaLogueado.set(this.authService.estaLogueado());
    const postId = Number(this.id());
    this.cargarPost(postId);
    this.cargarComentarios(postId);
  }

  cargarPost(postId: number): void {
    this.postService.obtenerPorId(postId).subscribe({
      next: (data) => {
        this.post.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar la publicacion');
        this.cargando.set(false);
      }
    });
  }

  cargarComentarios(postId: number): void {
    this.postService.listarComentarios(postId).subscribe({
      next: (data) => {
        this.comentarios.set(data);
      },
      error: () => {
        console.error('Error al cargar comentarios');
      }
    });
  }

  enviarComentario(): void {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    if (!this.authService.estaLogueado()) {
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
      error: () => {
        this.errorMsg.set('Error al enviar comentario');
        this.enviandoComentario.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
    });
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
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="16" fill="%23999" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
    img.alt = 'Imagen no disponible';
  }

  getInicialUsuario(): string {
    const usuario = this.authService.usuario();
    return usuario?.nombreUsuario?.charAt(0)?.toUpperCase() || '?';
  }
}