import { Component, OnInit, input, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReaccionService } from '../../../core/services/reaccion.service';
import { ComentarioService } from '../../../core/services/comentario.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { Post, Comentario, Respuesta, Adjunto, Autor } from '../../../core/models/post.model';
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
  private comentarioService = inject(ComentarioService);
  public authService = inject(AuthService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  id = input.required<string>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  enviandoRespuesta = signal<number | null>(null);
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

  formRespuesta = this.fb.group({
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
    this.comentarioService.listarPorPost(postId).subscribe({
      next: (data) => {
        const comentariosConUI = data.map(c => ({
          ...c,
          respuestas: [],
          totalRespuestas: 0,
          mostrandoRespuestas: false,
          mostrandoFormularioRespuesta: false,
          cargandoRespuestas: false
        }));
        this.comentarios.set(comentariosConUI);
      },
      error: () => {}
    });
  }

  cargarReacciones(postId: number): void {
    this.reaccionService.obtenerReaccionesPost(postId).subscribe({
      next: (data) => this.reacciones.set(data),
      error: () => {}
    });
  }

  // ========== REACCIONES AL POST ==========
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

  // ========== REACCIONES A COMENTARIOS ==========
  reaccionarComentario(comentarioId: number, tipo: string): void {
    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Inicia sesión para reaccionar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.comentarioService.reaccionarComentario(comentarioId, tipo).subscribe({
      next: (data) => {
        this.comentarios.update(lista =>
          lista.map(c => c.id === comentarioId ? { ...c, reacciones: data } : c)
        );
      },
      error: () => {}
    });
  }

  // ========== REACCIONES A RESPUESTAS ==========
  reaccionarRespuesta(comentarioId: number, respuestaId: number, tipo: string): void {
    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Inicia sesión para reaccionar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.comentarioService.reaccionarRespuesta(respuestaId, tipo).subscribe({
      next: (data) => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId && c.respuestas) {
              return {
                ...c,
                respuestas: c.respuestas.map(r => 
                  r.id === respuestaId ? { ...r, reacciones: data } : r
                )
              };
            }
            return c;
          })
        );
      },
      error: () => {}
    });
  }

  // ========== ENVIAR COMENTARIO ==========
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

    this.comentarioService.crear(Number(this.id()), contenido).subscribe({
      next: (nuevo) => {
        this.comentarios.update((lista) => [...lista, { 
          ...nuevo, 
          reacciones: { likes: 0, loves: 0 },
          respuestas: [],
          totalRespuestas: 0,
          mostrandoRespuestas: false,
          mostrandoFormularioRespuesta: false,
          cargandoRespuestas: false
        }]);
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

  // ========== ENVIAR RESPUESTA ==========
  enviarRespuesta(comentarioId: number): void {
    if (this.formRespuesta.invalid) {
      this.formRespuesta.markAllAsTouched();
      return;
    }
    if (!this.authService.isAuthenticated()) {
      this.errorMsg.set('Debes iniciar sesion para comentar');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.enviandoRespuesta.set(comentarioId);
    const contenido = this.formRespuesta.getRawValue().contenido!;

    this.comentarioService.crearRespuesta(comentarioId, contenido).subscribe({
      next: (nueva) => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId) {
              const respuestas = c.respuestas || [];
              return {
                ...c,
                respuestas: [...respuestas, nueva],
                totalRespuestas: (c.totalRespuestas || 0) + 1,
                mostrandoFormularioRespuesta: false,
                mostrandoRespuestas: true
              };
            }
            return c;
          })
        );
        this.formRespuesta.reset();
        this.enviandoRespuesta.set(null);
      },
      error: () => {
        this.errorMsg.set('Error al enviar respuesta');
        this.enviandoRespuesta.set(null);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ========== TOGGLE RESPONDER ==========
  toggleResponder(comentarioId: number): void {
    this.comentarios.update(lista =>
      lista.map(c => {
        if (c.id === comentarioId) {
          return {
            ...c,
            mostrandoFormularioRespuesta: !c.mostrandoFormularioRespuesta
          };
        }
        return c;
      })
    );
  }

  // ========== TOGGLE VER RESPUESTAS ==========
  toggleVerRespuestas(comentarioId: number): void {
    this.comentarios.update(lista =>
      lista.map(c => {
        if (c.id === comentarioId) {
          const mostrando = !c.mostrandoRespuestas;
          if (mostrando && (!c.respuestas || c.respuestas.length === 0)) {
            this.cargarRespuestas(comentarioId);
          }
          return {
            ...c,
            mostrandoRespuestas: mostrando
          };
        }
        return c;
      })
    );
  }

  cargarRespuestas(comentarioId: number): void {
    this.comentarios.update(lista =>
      lista.map(c => {
        if (c.id === comentarioId) {
          return { ...c, cargandoRespuestas: true };
        }
        return c;
      })
    );

    this.comentarioService.listarRespuestas(comentarioId).subscribe({
      next: (respuestas) => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId) {
              return {
                ...c,
                respuestas: respuestas,
                totalRespuestas: respuestas.length,
                cargandoRespuestas: false
              };
            }
            return c;
          })
        );
      },
      error: () => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId) {
              return { ...c, cargandoRespuestas: false };
            }
            return c;
          })
        );
      }
    });
  }

  // ========== ELIMINAR COMENTARIO ==========
  eliminarComentario(comentarioId: number): void {
    if (!confirm('¿Seguro que quieres eliminar este comentario?')) return;
    this.comentarioService.eliminar(comentarioId).subscribe({
      next: () => {
        this.comentarios.update(lista => lista.filter(c => c.id !== comentarioId));
        this.exitoMsg('Comentario eliminado');
      },
      error: () => {
        this.errorMsg.set('Error al eliminar comentario');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ========== ELIMINAR RESPUESTA ==========
  eliminarRespuesta(comentarioId: number, respuestaId: number): void {
    if (!confirm('¿Seguro que quieres eliminar esta respuesta?')) return;
    this.comentarioService.eliminarRespuesta(respuestaId).subscribe({
      next: () => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId && c.respuestas) {
              return {
                ...c,
                respuestas: c.respuestas.filter(r => r.id !== respuestaId),
                totalRespuestas: (c.totalRespuestas || 0) - 1
              };
            }
            return c;
          })
        );
        this.exitoMsg('Respuesta eliminada');
      },
      error: () => {
        this.errorMsg.set('Error al eliminar respuesta');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ========== VERIFICAR SI ES AUTOR ==========
  esAutor(autor: Autor): boolean {
    const usuario = this.authService.usuario();
    return usuario?.id === autor.id;
  }

  // ========== UTILIDADES ==========
  exitoMsg(mensaje: string): void {
    this.errorMsg.set(null);
    // Usar un signal para mensajes de éxito si existe, o console.log
    console.log('✅', mensaje);
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