import { Component, OnInit, input, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReaccionService } from '../../../core/services/reaccion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { Post, Comentario, Adjunto } from '../../../core/models/post.model';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';

@Component({
  selector: 'kiert-post-detail',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink, AvatarFrameComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
})
export class PostDetailComponent implements OnInit {
  private postService = inject(PostService);
  private reaccionService = inject(ReaccionService);
  public authService = inject(AuthService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  id = input.required<string>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  errorMsg = signal<string | null>(null);
  estaLogueado = signal<boolean>(false);

  reacciones = signal({
    likes: 0, loves: 0, hahas: 0, wows: 0, sads: 0, angrys: 0
  });

  userReactions = signal({
    like: false, love: false, haha: false, wow: false, sad: false, angry: false
  });

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
    if (!postId || isNaN(postId)) {
      this.errorMsg.set('ID de publicación inválido');
      this.cargando.set(false);
      return;
    }
    this.cargarPost(postId);
    this.cargarComentarios(postId);
    this.cargarReacciones(postId);
  }

  cargarPost(postId: number): void {
    this.cargando.set(true);
    this.postService.obtenerPorId(postId).subscribe({
      next: (data) => {
        this.post.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMsg.set('Error al cargar la publicación');
      }
    });
  }

  cargarComentarios(postId: number): void {
    this.postService.listarComentarios(postId).subscribe({
      next: (data) => this.comentarios.set(data),
      error: () => {}
    });
  }

  cargarReacciones(postId: number): void {
    this.reaccionService.obtenerReaccionesPost(postId).subscribe({
      next: (data) => this.reacciones.set(data),
      error: () => {}
    });
  }

  reaccionar(tipo: string): void {
    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Inicia sesión para reaccionar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    const postId = Number(this.id());
    this.reaccionService.reaccionarPost(postId, tipo).subscribe({
      next: (data) => {
        this.reacciones.set(data);
        const userKey = this.getUserKey(tipo);
        this.userReactions.update(prev => ({ ...prev, [userKey]: !prev[userKey] }));
      },
      error: () => {
        this.errorMsg.set('Error al procesar la reacción');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  reaccionarComentario(comentarioId: number, tipo: string): void {
    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Inicia sesión para reaccionar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.reaccionService.reaccionarComentario(comentarioId, tipo).subscribe({
      next: (data) => {
        this.comentarios.update(lista =>
          lista.map(c => c.id === comentarioId ? { ...c, reacciones: data } : c)
        );
      },
      error: () => {}
    });
  }

  getUserKey(tipo: string): 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' {
    switch(tipo) {
      case 'like': return 'like';
      case 'love': return 'love';
      case 'haha': return 'haha';
      case 'wow': return 'wow';
      case 'sad': return 'sad';
      case 'angry': return 'angry';
      default: return 'like';
    }
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
        this.comentarios.update((lista) => [...lista, { ...nuevo, reacciones: { likes: 0, loves: 0 } }]);
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

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  getInicialUsuario(): string {
    const usuario = this.authService.usuario();
    return usuario?.nombreUsuario?.charAt(0)?.toUpperCase() || '?';
  }
}