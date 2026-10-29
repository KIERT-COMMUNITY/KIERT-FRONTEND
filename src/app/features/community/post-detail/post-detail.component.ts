// src/app/features/community/post-detail/post-detail.component.ts
import {
  Component, OnInit, OnDestroy, input, signal, computed, inject, isDevMode
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { ReaccionService } from '../../../core/services/reaccion.service';
import { ComentarioService } from '../../../core/services/comentario.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { CompartidoService } from '../../../core/services/compartido.service';
import { PostsOcultosService } from '../../../core/services/posts-ocultos.service';
import { Post, Comentario, Adjunto, Autor, Subtitulo } from '../../../core/models/post.model';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';
import { ReporteModalComponent } from '../../../shared/components/reporte-modal/reporte-modal.component';
import { CompartirModalComponent } from '../../../shared/components/compartir-modal/compartir-modal.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import {
  safeUrl, safeCssGradient, safeClassToken, openExternalSafe
} from '../../../shared/utils/url-sanitizer';

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
export class PostDetailComponent implements OnInit, OnDestroy {
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

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);
  enviandoRespuesta = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  estaLogueado = signal<boolean>(false);

  // ===== MENU OCULTAR =====
  mostrarMenuOcultar = signal(false);

  // ===== CONFIRMAR ELIMINAR =====
  mostrarConfirmEliminarComentario = signal(false);
  comentarioAEliminar = signal<number | null>(null);
  mostrarConfirmEliminarRespuesta = signal(false);
  respuestaAEliminar = signal<{ comentarioId: number; respuestaId: number } | null>(null);
  eliminandoComentario = signal(false);

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
    contenido: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(2000)
    ]],
  });

  formRespuesta = this.fb.group({
    contenido: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(2000)
    ]],
  });

  // ===== COMPUTED SEGUROS PARA EL TEMPLATE =====

  /** Clase de tema saneada. */
  temaClaseSeguro = computed<string>(() =>
    'tema-' + safeClassToken(this.personalizacionStore.temaId(), 'default')
  );

  /** Fondo degradado saneado. */
  fondoSeguro = computed<string>(() =>
    safeCssGradient(this.personalizacionStore.fondoGradiente())
  );

  ngOnInit(): void {
    this.estaLogueado.set(this.authService.isAuthenticated());
    const postId = Number(this.id());
    if (!postId || !Number.isFinite(postId) || !Number.isInteger(postId) || postId <= 0) {
      this.errorMsg.set('ID de publicacion invalido');
      this.cargando.set(false);
      return;
    }
    this.cargarPost(postId);
    this.cargarComentarios(postId);
    this.cargarReacciones(postId);
    this.cargarCompartidos(postId);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
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
    this.router.navigate(['/comunidad']);
  }

  // ===== AVISO LOGIN =====
  abrirAviso(mensaje: string): void {
    this.mensajeAvisoLogin.set(mensaje);
    this.mostrarAvisoLogin.set(true);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  // ===== HELPERS DE CATEGORIA =====
  getCategoriaFormateada(categoria: string): string {
    if (!categoria) return 'Sin categoria';
    const categoriaLimpia = categoria.replace(/-/g, ' ');
    return categoriaLimpia
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  getColorCategoria(categoria: string): string {
    // Colores fijos del codigo: no hay riesgo, pero se devuelve siempre un hex valido.
    if (!categoria) return '#8b98a5';
    const c = categoria.toLowerCase();
    if (c.includes('hacking') || c.includes('seguridad') || c.includes('ciber')) return '#ff6b6b';
    if (c.includes('ayuda') || c.includes('emergencia') || c.includes('socorro')) return '#feca57';
    if (c.includes('historia') || c.includes('experiencia') || c.includes('caso')) return '#55efc4';
    if (c.includes('programacion') || c.includes('codigo') || c.includes('desarrollo')) return '#0984e3';
    if (c.includes('redes') || c.includes('network') || c.includes('infraestructura')) return '#6c5ce7';
    if (c.includes('ia') || c.includes('inteligencia') || c.includes('machine')) return '#fd79a8';
    return '#2dd4bf';
  }

  getMarcoDelAutor(): string {
    return safeClassToken(this.post()?.autor?.marcoId, 'none');
  }

  esAutor(autor: Autor | null | undefined): boolean {
    if (!autor || !autor.id) return false;
    const usuario = this.authService.usuario();
    if (!usuario?.id) return false;
    return usuario.id === autor.id;
  }

  // ===== HELPERS DE URL PARA EL TEMPLATE =====
  getFotoAutor(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  getAdjuntoUrl(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  getAdjuntoPoster(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  getSubtituloUrl(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  getFotoComentario(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  getFotoRespuesta(url: string | null | undefined): string | null {
    return safeUrl(url);
  }

  // ===== CARGA =====
  cargarPost(postId: number): void {
    this.cargando.set(true);
    this.postService.obtenerPorId(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.post.set(data);
          this.inicializarSubtitulos(data);
          this.cargando.set(false);
        },
        error: (error) => {
          if (isDevMode()) console.error('Error al cargar post:', error);
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
    this.comentarioService.listarPorPost(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    this.reaccionService.obtenerReaccionesPost(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.reacciones.set(data),
        error: () => {}
      });
  }

  cargarCompartidos(postId: number): void {
    this.compartidoService.contarCompartidos(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => this.totalCompartidos.set(res.total || 0),
        error: () => {}
      });
  }

  // ===== REACCIONES =====
  reaccionar(tipo: string, event?: MouseEvent): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reaccionar a las publicaciones.');
      return;
    }
    const postId = Number(this.id());
    if (!postId) return;

    this.reaccionService.reaccionarPost(postId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.reacciones.set(data);
          const userKey = this.getUserKey(tipo);
          this.userReactions.update(prev => ({ ...prev, [userKey]: !prev[userKey] }));
        },
        error: () => {
          this.errorMsg.set('Error al procesar la reaccion');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  reaccionarComentario(comentarioId: number, tipo: string, event?: MouseEvent): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para reaccionar a los comentarios.');
      return;
    }
    this.comentarioService.reaccionarComentario(comentarioId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
    this.comentarioService.reaccionarRespuesta(respuestaId, tipo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  // ===== COMENTARIOS =====
  enviarComentario(): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para comentar.');
      return;
    }
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }
    const contenido = (this.formComentario.getRawValue().contenido || '').trim();
    if (!contenido) return;

    this.enviandoComentario.set(true);
    this.comentarioService.crear(Number(this.id()), contenido)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
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
    const contenido = (this.formRespuesta.getRawValue().contenido || '').trim();
    if (!contenido) return;

    this.enviandoRespuesta.set(comentarioId);
    this.comentarioService.crearRespuesta(comentarioId, contenido)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  toggleResponder(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para responder.');
      return;
    }
    this.comentarios.update(lista =>
      lista.map(c => c.id === comentarioId
        ? { ...c, mostrandoFormularioRespuesta: !c.mostrandoFormularioRespuesta }
        : c
      )
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
    this.comentarioService.listarRespuestas(comentarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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

  // ===== ELIMINAR (con modal propio) =====
  abrirConfirmEliminarComentario(comentarioId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para eliminar comentarios.');
      return;
    }
    this.comentarioAEliminar.set(comentarioId);
    this.mostrarConfirmEliminarComentario.set(true);
  }

  cerrarConfirmEliminarComentario(): void {
    if (this.eliminandoComentario()) return;
    this.mostrarConfirmEliminarComentario.set(false);
    this.comentarioAEliminar.set(null);
  }

  confirmarEliminarComentario(): void {
    const comentarioId = this.comentarioAEliminar();
    if (!comentarioId) return;

    this.eliminandoComentario.set(true);
    this.comentarioService.eliminar(comentarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.comentarios.update(lista => lista.filter(c => c.id !== comentarioId));
          this.eliminandoComentario.set(false);
          this.mostrarConfirmEliminarComentario.set(false);
          this.comentarioAEliminar.set(null);
        },
        error: () => {
          this.eliminandoComentario.set(false);
          this.mostrarConfirmEliminarComentario.set(false);
          this.comentarioAEliminar.set(null);
          this.errorMsg.set('Error al eliminar comentario');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  abrirConfirmEliminarRespuesta(comentarioId: number, respuestaId: number): void {
    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para eliminar respuestas.');
      return;
    }
    this.respuestaAEliminar.set({ comentarioId, respuestaId });
    this.mostrarConfirmEliminarRespuesta.set(true);
  }

  cerrarConfirmEliminarRespuesta(): void {
    if (this.eliminandoComentario()) return;
    this.mostrarConfirmEliminarRespuesta.set(false);
    this.respuestaAEliminar.set(null);
  }

  confirmarEliminarRespuesta(): void {
    const objetivo = this.respuestaAEliminar();
    if (!objetivo) return;

    this.eliminandoComentario.set(true);
    this.comentarioService.eliminarRespuesta(objetivo.respuestaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.comentarios.update(lista =>
            lista.map(c => {
              if (c.id === objetivo.comentarioId && c.respuestas) {
                return {
                  ...c,
                  respuestas: c.respuestas.filter(r => r.id !== objetivo.respuestaId),
                  totalRespuestas: Math.max(0, (c.totalRespuestas || 0) - 1)
                };
              }
              return c;
            })
          );
          this.eliminandoComentario.set(false);
          this.mostrarConfirmEliminarRespuesta.set(false);
          this.respuestaAEliminar.set(null);
        },
        error: () => {
          this.eliminandoComentario.set(false);
          this.mostrarConfirmEliminarRespuesta.set(false);
          this.respuestaAEliminar.set(null);
          this.errorMsg.set('Error al eliminar respuesta');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ===== REPORTES =====
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

  // ===== COMPARTIR =====
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

  // ===== SUBTITULOS =====
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
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    if (!this.authService.isAuthenticated()) {
      this.abrirAviso('Debes registrarte para subir subtitulos.');
      input.value = '';
      return;
    }

    const file = input.files?.[0];
    if (!file) { input.value = ''; return; }

    // Validacion de extension
    if (!file.name.toLowerCase().endsWith('.vtt')) {
      this.errorMsg.set('Solo se permiten archivos .vtt para subtitulos');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    // Validacion de tamano (max 2 MB)
    if (file.size > 2 * 1024 * 1024) {
      this.errorMsg.set('El archivo .vtt no debe superar los 2MB');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    // Idioma: solo letras y guion, 2-10 chars (ISO 639-1 o BCP-47 simple)
    const idiomaRaw = prompt('Codigo de idioma (ej: es, en, pt):', 'es');
    const idioma = (idiomaRaw || '').trim().toLowerCase();
    if (!/^[a-z]{2}(-[a-z]{2})?$/.test(idioma)) {
      this.errorMsg.set('Codigo de idioma invalido (ej: es, en, pt)');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    // Etiqueta: texto plano, 1-40 chars, sin caracteres de control
    const etiquetaRaw = prompt('Nombre visible del idioma (ej: Espanol):', 'Espanol');
    const etiqueta = (etiquetaRaw || '').trim();
    if (!etiqueta || etiqueta.length > 40 || /[\u0000-\u001f\u007f<>]/.test(etiqueta)) {
      this.errorMsg.set('Nombre de idioma invalido');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    this.subiendoSubtitulo.set(adjuntoId);

    this.postService.subirSubtitulo(adjuntoId, file, idioma, etiqueta, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ===== HELPERS =====
  getUserKey(tipo: string): 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry' {
    switch (tipo) {
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
      const ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
      return ext.some(e => nombre.endsWith(e));
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
    const ext = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v'];
    return ext.some(e => nombre.endsWith(e));
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

  // ===== ABRIR IMAGEN (seguro) =====
  abrirImagen(url: string): void {
    openExternalSafe(safeUrl(url));
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