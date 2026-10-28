// src/app/features/community/post-detail/post-detail.component.ts
import { Component, OnInit, input, signal, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReaccionService } from '../../../core/services/reaccion.service';
import { ComentarioService } from '../../../core/services/comentario.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { CompartidoService } from '../../../core/services/compartido.service';
import { PostsOcultosService } from '../../../core/services/posts-ocultos.service';
import { Post, Comentario, Respuesta, Adjunto, Autor, Subtitulo } from '../../../core/models/post.model';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';
import { ReporteModalComponent } from '../../../shared/components/reporte-modal/reporte-modal.component';
import { CompartirModalComponent } from '../../../shared/components/compartir-modal/compartir-modal.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-post-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    AvatarFrameComponent,
    ReporteModalComponent,
    CompartirModalComponent,
    AvisoLoginComponent
  ],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
})
export class PostDetailComponent implements OnInit {
  private postService = inject(PostService);
  private reaccionService = inject(ReaccionService);
  private comentarioService = inject(ComentarioService);
  private compartidoService = inject(CompartidoService);
  private postsOcultos = inject(PostsOcultosService);
  public authService = inject(AuthService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  id = input.required<string>();

  get postId(): number {
    return Number(this.id());
  }

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  enviandoRespuesta = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  estaLogueado = signal<boolean>(false);

  // ===== NUEVO: menú de ocultar =====
  mostrarMenuOcultar = signal(false);

  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal<string>('Debes registrarte para interactuar con esta publicacion.');

  mostrarModalReporte = signal(false);
  tipoReporteActual = signal<'POST' | 'COMENTARIO' | 'RESPUESTA' | 'USUARIO'>('POST');
  datosReporte = signal<{
    postId?: number;
    comentarioId?: number;
    respuestaId?: number;
    usuarioReportadoId?: number;
  }>({});

  mostrarModalCompartir = signal(false);
  totalCompartidos = signal(0);

  subtitulosActivos = signal<{ [adjuntoId: number]: boolean }>({});
  idiomaSeleccionado = signal<{ [adjuntoId: number]: string }>({});
  subiendoSubtitulo = signal<number | null>(null);

  reacciones = signal({
    likes: 0, loves: 0, hahas: 0, wows: 0, sads: 0, angrys: 0
  });

  userReactions = signal({
    like: false, love: false, haha: false, wow: false, sad: false, angry: false
  });

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
      this.errorMsg.set('ID de publicacion invalido');
      this.cargando.set(false);
      return;
    }
    this.cargarPost(postId);
    this.cargarComentarios(postId);
    this.cargarReacciones(postId);
    this.cargarCompartidos(postId);
  }

  // ===== OCULTAR POST =====
  toggleMenuOcultar(event: Event): void {
    event.stopPropagation();
    this.mostrarMenuOcultar.update(v => !v);
  }

  cerrarMenuOcultar(): void {
    this.mostrarMenuOcultar.set(false);
  }

  ocultarEstePost(motivo: 'sensible' | 'no-interesa' | 'otro', event: Event): void {
    event.stopPropagation();
    const postId = Number(this.id());
    if (!postId) return;

    this.postsOcultos.ocultar(postId, motivo);
    this.cerrarMenuOcultar();

    // Volver al feed después de ocultar
    this.router.navigate(['/comunidad']);
  }

  // ===== RESTO DE MÉTODOS (igual que antes) =====
  abrirAviso(mensaje: string): void {
    this.mensajeAvisoLogin.set(mensaje);
    this.mostrarAvisoLogin.set(true);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  getCategoriaFormateada(categoria: string): string {
    if (!categoria) return 'Sin categoria';
    const categoriaLimpia = categoria.replace(/-/g, ' ');
    return categoriaLimpia
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  getColorCategoria(categoria: string): string {
    if (!categoria) return '#8b98a5';
    const categoriaLower = categoria.toLowerCase();
    if (categoriaLower.includes('hacking') || categoriaLower.includes('seguridad') || categoriaLower.includes('ciber')) return '#ff6b6b';
    if (categoriaLower.includes('ayuda') || categoriaLower.includes('emergencia') || categoriaLower.includes('socorro')) return '#feca57';
    if (categoriaLower.includes('historia') || categoriaLower.includes('experiencia') || categoriaLower.includes('caso')) return '#55efc4';
    if (categoriaLower.includes('programacion') || categoriaLower.includes('codigo') || categoriaLower.includes('desarrollo')) return '#0984e3';
    if (categoriaLower.includes('redes') || categoriaLower.includes('network') || categoriaLower.includes('infraestructura')) return '#6c5ce7';
    if (categoriaLower.includes('ia') || categoriaLower.includes('inteligencia') || categoriaLower.includes('machine')) return '#fd79a8';
    return '#2dd4bf';
  }

  getMarcoDelAutor(): string {
    return this.post()?.autor?.marcoId || 'none';
  }

  esAutor(autor: Autor | null | undefined): boolean {
    if (!autor || !autor.id) return false;
    const usuario = this.authService.usuario();
    if (!usuario?.id) return false;
    return usuario.id === autor.id;
  }

  cargarPost(postId: number): void {
    this.cargando.set(true);
    this.postService.obtenerPorId(postId).subscribe({
      next: (data) => {
        this.post.set(data);
        this.inicializarSubtitulos(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar post:', error);
        this.cargando.set(false);
        this.errorMsg.set('Error al cargar la publicacion');
      }
    });
  }

  private inicializarSubtitulos(post: Post): void {
    const activos: { [id: number]: boolean } = {};
    const idiomas: { [id: number]: string } = {};
    (post.adjuntos || [])
      .filter(a => this.esVideo(a))
      .forEach(video => {
        if (video.subtitulos && video.subtitulos.length > 0) {
          const porDefecto = video.subtitulos.find(s => s.porDefecto) || video.subtitulos[0];
          activos[video.id] = !!porDefecto.porDefecto;
          idiomas[video.id] = porDefecto.idioma;
        }
      });
    this.subtitulosActivos.set(activos);
    this.idiomaSeleccionado.set(idiomas);
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
          cargandoRespuestas: false,
          userReactions: c.userReactions || { like: false, love: false }
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

  cargarCompartidos(postId: number): void {
    this.compartidoService.contarCompartidos(postId).subscribe({
      next: (res) => this.totalCompartidos.set(res.total || 0),
      error: () => {}
    });
  }

  reaccionar(tipo: string, event?: MouseEvent): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reaccionar a las publicaciones.');
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
        this.errorMsg.set('Error al procesar la reaccion');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  reaccionarComentario(comentarioId: number, tipo: string, event?: MouseEvent): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reaccionar a los comentarios.');
      return;
    }
    this.comentarioService.reaccionarComentario(comentarioId, tipo).subscribe({
      next: (data) => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId) {
              const userReactions = c.userReactions || { like: false, love: false };
              const key = tipo as 'like' | 'love';
              return {
                ...c,
                reacciones: data,
                userReactions: { ...userReactions, [key]: !userReactions[key] }
              };
            }
            return c;
          })
        );
      },
      error: () => {}
    });
  }

  reaccionarRespuesta(comentarioId: number, respuestaId: number, tipo: string, event?: MouseEvent): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reaccionar a las respuestas.');
      return;
    }
    this.comentarioService.reaccionarRespuesta(respuestaId, tipo).subscribe({
      next: (data) => {
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId && c.respuestas) {
              return {
                ...c,
                respuestas: c.respuestas.map(r => {
                  if (r.id !== respuestaId) return r;
                  const userReactions = r.userReactions || { like: false, love: false };
                  const key = tipo as 'like' | 'love';
                  return {
                    ...r,
                    reacciones: data,
                    userReactions: { ...userReactions, [key]: !userReactions[key] }
                  };
                })
              };
            }
            return c;
          })
        );
      },
      error: () => {}
    });
  }

  enviarComentario(): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para comentar.');
      return;
    }
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
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
          cargandoRespuestas: false,
          userReactions: { like: false, love: false }
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

  enviarRespuesta(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para responder.');
      return;
    }
    if (this.formRespuesta.invalid) {
      this.formRespuesta.markAllAsTouched();
      return;
    }
    this.enviandoRespuesta.set(comentarioId);
    const contenido = this.formRespuesta.getRawValue().contenido!;

    this.comentarioService.crearRespuesta(comentarioId, contenido).subscribe({
      next: (nueva) => {
        const respuestaConUI = {
          ...nueva,
          reacciones: nueva.reacciones || { likes: 0, loves: 0 },
          userReactions: nueva.userReactions || { like: false, love: false }
        };
        this.comentarios.update(lista =>
          lista.map(c => {
            if (c.id === comentarioId) {
              const respuestas = c.respuestas || [];
              return {
                ...c,
                respuestas: [...respuestas, respuestaConUI],
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

  toggleResponder(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para responder.');
      return;
    }
    this.comentarios.update(lista =>
      lista.map(c => {
        if (c.id === comentarioId) {
          return { ...c, mostrandoFormularioRespuesta: !c.mostrandoFormularioRespuesta };
        }
        return c;
      })
    );
  }

  toggleVerRespuestas(comentarioId: number): void {
    this.comentarios.update(lista =>
      lista.map(c => {
        if (c.id === comentarioId) {
          const mostrando = !c.mostrandoRespuestas;
          if (mostrando && (!c.respuestas || c.respuestas.length === 0)) {
            this.cargarRespuestas(comentarioId);
          }
          return { ...c, mostrandoRespuestas: mostrando };
        }
        return c;
      })
    );
  }

  cargarRespuestas(comentarioId: number): void {
    this.comentarios.update(lista =>
      lista.map(c => c.id === comentarioId ? { ...c, cargandoRespuestas: true } : c)
    );
    this.comentarioService.listarRespuestas(comentarioId).subscribe({
      next: (respuestas) => {
        const respuestasConUI = respuestas.map(r => ({
          ...r,
          userReactions: r.userReactions || { like: false, love: false }
        }));
        this.comentarios.update(lista =>
          lista.map(c => c.id === comentarioId
            ? { ...c, respuestas: respuestasConUI, totalRespuestas: respuestasConUI.length, cargandoRespuestas: false }
            : c
          )
        );
      },
      error: () => {
        this.comentarios.update(lista =>
          lista.map(c => c.id === comentarioId ? { ...c, cargandoRespuestas: false } : c)
        );
      }
    });
  }

  eliminarComentario(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para eliminar comentarios.');
      return;
    }
    if (!confirm('Seguro que quieres eliminar este comentario?')) return;
    this.comentarioService.eliminar(comentarioId).subscribe({
      next: () => {
        this.comentarios.update(lista => lista.filter(c => c.id !== comentarioId));
      },
      error: () => {
        this.errorMsg.set('Error al eliminar comentario');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  eliminarRespuesta(comentarioId: number, respuestaId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para eliminar respuestas.');
      return;
    }
    if (!confirm('Seguro que quieres eliminar esta respuesta?')) return;
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
      },
      error: () => {
        this.errorMsg.set('Error al eliminar respuesta');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  reportarPost(): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reportar publicaciones.');
      return;
    }
    this.tipoReporteActual.set('POST');
    this.datosReporte.set({ postId: Number(this.id()) });
    this.mostrarModalReporte.set(true);
  }

  reportarComentario(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reportar comentarios.');
      return;
    }
    this.tipoReporteActual.set('COMENTARIO');
    this.datosReporte.set({ comentarioId });
    this.mostrarModalReporte.set(true);
  }

  reportarRespuesta(respuestaId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reportar respuestas.');
      return;
    }
    this.tipoReporteActual.set('RESPUESTA');
    this.datosReporte.set({ respuestaId });
    this.mostrarModalReporte.set(true);
  }

  reportarUsuario(usuarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reportar usuarios.');
      return;
    }
    this.tipoReporteActual.set('USUARIO');
    this.datosReporte.set({ usuarioReportadoId: usuarioId });
    this.mostrarModalReporte.set(true);
  }

  cerrarModalReporte(): void {
    this.mostrarModalReporte.set(false);
  }

  abrirModalCompartir(): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para compartir publicaciones.');
      return;
    }
    this.mostrarModalCompartir.set(true);
  }

  cerrarModalCompartir(): void {
    this.mostrarModalCompartir.set(false);
    this.cargarCompartidos(Number(this.id()));
  }

  tieneSubtitulos(adjunto: Adjunto): boolean {
    return !!(adjunto.subtitulos && adjunto.subtitulos.length > 0);
  }

  toggleSubtitulos(adjuntoId: number): void {
    this.subtitulosActivos.update(prev => ({ ...prev, [adjuntoId]: !prev[adjuntoId] }));
  }

  cambiarIdiomaSubtitulos(adjuntoId: number, idioma: string): void {
    this.idiomaSeleccionado.update(prev => ({ ...prev, [adjuntoId]: idioma }));
    this.subtitulosActivos.update(prev => ({ ...prev, [adjuntoId]: true }));
  }

  obtenerSubtituloActivo(adjunto: Adjunto): Subtitulo | undefined {
    if (!adjunto.subtitulos?.length) return undefined;
    const idioma = this.idiomaSeleccionado()[adjunto.id];
    if (idioma) return adjunto.subtitulos.find(s => s.idioma === idioma);
    return adjunto.subtitulos.find(s => s.porDefecto) || adjunto.subtitulos[0];
  }

  onSubtituloSeleccionado(event: Event, adjuntoId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para subir subtitulos.');
      (event.target as HTMLInputElement).value = '';
      return;
    }

    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.vtt')) {
      this.errorMsg.set('Solo se permiten archivos .vtt para subtitulos');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    const idioma = prompt('Codigo de idioma (ej: es, en, pt):', 'es');
    if (!idioma) { input.value = ''; return; }

    const etiqueta = prompt('Nombre visible del idioma (ej: Espanol):', 'Espanol');
    if (!etiqueta) { input.value = ''; return; }

    this.subiendoSubtitulo.set(adjuntoId);

    this.postService.subirSubtitulo(adjuntoId, file, idioma, etiqueta, true).subscribe({
      next: (nuevoSub) => {
        this.post.update(p => {
          if (!p) return p;
          return {
            ...p,
            adjuntos: p.adjuntos.map(a => {
              if (a.id !== adjuntoId) return a;
              const subtitulos = [...(a.subtitulos || []), nuevoSub];
              return { ...a, subtitulos };
            })
          };
        });
        this.idiomaSeleccionado.update(prev => ({ ...prev, [adjuntoId]: nuevoSub.idioma }));
        this.subtitulosActivos.update(prev => ({ ...prev, [adjuntoId]: true }));
        this.subiendoSubtitulo.set(null);
        input.value = '';
      },
      error: () => {
        this.errorMsg.set('Error al subir subtitulos');
        this.subiendoSubtitulo.set(null);
        input.value = '';
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
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

  volverAlFeed(): void {
    this.router.navigate(['/comunidad']);
  }

  esImagen(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (tipo === 'imagen' || tipo === 'image' || tipo === 'gif') return true;
    if (tipo === 'archivo' || tipo === 'file') {
      const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
      return extensiones.some(ext => nombre.endsWith(ext));
    }
    return false;
  }

  esVideo(adjunto: Adjunto): boolean {
    if (!adjunto) return false;
    const tipo = adjunto.tipo?.toLowerCase() || '';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    const mime = adjunto.mimeType?.toLowerCase() || '';
    if (tipo === 'video') return true;
    if (mime.startsWith('video/')) return true;
    const extensiones = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
    return extensiones.some(ext => nombre.endsWith(ext));
  }

  obtenerImagenes(): Adjunto[] {
    return (this.post()?.adjuntos || []).filter(a => this.esImagen(a));
  }

  obtenerVideos(): Adjunto[] {
    return (this.post()?.adjuntos || []).filter(a => this.esVideo(a));
  }

  obtenerOtrosAdjuntos(): Adjunto[] {
    return (this.post()?.adjuntos || []).filter(a => !this.esImagen(a) && !this.esVideo(a));
  }

  cantidadImagenes(): number { return this.obtenerImagenes().length; }
  tieneImagenes(): boolean { return this.cantidadImagenes() > 0; }
  tieneVideos(): boolean { return this.obtenerVideos().length > 0; }
  tieneOtrosAdjuntos(): boolean { return this.obtenerOtrosAdjuntos().length > 0; }
  tieneAdjuntos(): boolean { return (this.post()?.adjuntos || []).length > 0; }

  getIconoAdjunto(adjunto: Adjunto): string {
    if (!adjunto) return 'Archivo';
    if (adjunto.tipo === 'link') return 'Enlace';
    const nombre = adjunto.nombre?.toLowerCase() || '';
    if (nombre.endsWith('.pdf')) return 'PDF';
    if (nombre.endsWith('.doc') || nombre.endsWith('.docx')) return 'DOC';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar')) return 'ZIP';
    if (nombre.endsWith('.txt')) return 'TXT';
    if (nombre.endsWith('.vtt') || nombre.endsWith('.srt')) return 'SUB';
    return 'Archivo';
  }

  abrirImagen(url: string): void {
    window.open(url, '_blank');
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | HTMLVideoElement;
    if (target instanceof HTMLImageElement) {
      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%235a6a7a" text-anchor="middle" dy=".3em"%3EImagen no disponible%3C/text%3E%3C/svg%3E';
      target.alt = 'Imagen no disponible';
    }
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