// src/app/features/settings/settings.component.ts
import { Component, OnInit, signal, computed, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionService } from '../../../core/services/personalizacion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { UserService } from '../../../core/services/user.service';
import { ChatService } from '../../../core/services/chat.service';
import { BloqueoService, Bloqueo } from '../../../core/services/bloqueo.service';
import { ImageSanitizerService } from '../../../core/services/image-sanitizer.service';
import { PostsOcultosService } from '../../../core/services/posts-ocultos.service';
import { User } from '../../../core/models/user.model';
import { environment } from '../../../../environments/environment';

import { KeyboardHelpComponent } from '../../../shared/components/keyboard-help/keyboard-help.component';
import { KeyboardShortcutsService } from '../../../core/services/keyboard-shortcuts.service';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

type SeccionActiva = 'perfil' | 'bloqueados' | 'accesibilidad' | 'cuenta';
type EstadoRelacion = 'DESCONOCIDO' | 'CONTACTO' | 'SOLICITUD_ENVIADA' | 'SOLICITUD_RECIBIDA' | 'YO_MISMO';

@Component({
  selector: 'kiert-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    KeyboardHelpComponent,
    AvisoLoginComponent
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private personalizacionService = inject(PersonalizacionService);
  private userService = inject(UserService);
  private chatService = inject(ChatService);
  private bloqueoService = inject(BloqueoService);
  private imageSanitizer = inject(ImageSanitizerService);
  private http = inject(HttpClient);
  private postsOcultos = inject(PostsOcultosService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  public shortcuts = inject(KeyboardShortcutsService);

  private destroy$ = new Subject<void>();

  usuario = this.authService.usuario;
  cargando = signal(false);
  buscando = signal(false);
  enviandoSolicitud = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  editandoPerfil = signal(false);
  busquedaUsuario = signal<string>('');
  usuarioBuscado = signal<User | null>(null);
  usuariosEncontrados = signal<User[]>([]);
  busquedaError = signal<string | null>(null);
  mostrandoResultados = signal(false);
  solicitudEnviada = signal<number | null>(null);

  estadosRelacion = signal<Map<number, EstadoRelacion>>(new Map());

  seccionActiva = signal<SeccionActiva>('perfil');

  bloqueados = signal<Bloqueo[]>([]);
  cargandoBloqueados = signal(false);
  busquedaBloqueado = signal('');

  // ✅ AVISO LOGIN
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para acceder a los ajustes.');

  // ✅ ELIMINAR CUENTA
  mostrarModalEliminar = signal(false);
  confirmacionTexto = signal('');

  // ✅ NUEVO: MODAL POSTS OCULTOS
  mostrarModalOcultos = signal(false);
  cantidadOcultos = computed(() => this.postsOcultos.total());

  bloqueadosFiltrados = computed(() => {
    const query = this.busquedaBloqueado().toLowerCase().trim();
    if (!query) return this.bloqueados();
    return this.bloqueados().filter(b =>
      b.usuarioBloqueadoNombre?.toLowerCase().includes(query) ||
      b.motivo?.toLowerCase().includes(query)
    );
  });

  showThemeSelector = signal(false);
  showFrameSelector = signal(false);
  showBackgroundSelector = signal(false);
  showFontSizeSelector = signal(false);

  private busquedaSubject = new Subject<string>();

  selectedTheme = signal<string>('default');
  selectedFrame = signal<string>('none');
  selectedBackground = signal<string>('default');

  colorThemes = this.personalizacionStore.colorThemes;
  marcosData = this.personalizacionStore.marcosData;
  fondosData = this.personalizacionStore.fondosData;

  escalaFuente = this.personalizacionStore.escalaFuente;
  etiquetaEscala = this.personalizacionStore.etiquetaEscala;
  porcentajeEscala = this.personalizacionStore.porcentajeEscala;
  tamanosPredefinidos = this.personalizacionStore.tamanosPredefinidos;

  formPerfil = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
  });

  constructor() {
    effect(() => {
      const personalizacion = this.personalizacionStore.personalizacion();
      if (personalizacion) {
        this.selectedTheme.set(personalizacion.temaId || 'default');
        this.selectedFrame.set(personalizacion.marcoId || 'none');
        this.selectedBackground.set(personalizacion.fondoId || 'default');
        this.aplicarTemaGlobal(personalizacion.temaId || 'default');
      }
    });
  }

  // ✅ Getter logueado
  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  // ✅ Abrir/cerrar aviso
  abrirAvisoLogin(mensaje: string): void {
    this.mensajeAvisoLogin.set(mensaje);
    this.mostrarAvisoLogin.set(true);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/ajustes' }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  ngOnInit(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para acceder a los ajustes de tu cuenta.');
      return;
    }

    this.cargarDatosUsuario();
    this.personalizacionStore.cargarPersonalizacion();
    this.personalizacionStore.cargarMarcos();
    this.personalizacionStore.cargarFondos();
    this.cargarBloqueados();

    const current = this.personalizacionStore.personalizacion();
    if (current) {
      this.selectedTheme.set(current.temaId || 'default');
      this.selectedFrame.set(current.marcoId || 'none');
      this.selectedBackground.set(current.fondoId || 'default');
      this.aplicarTemaGlobal(current.temaId || 'default');
    }

    this.busquedaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        const username = query.trim();
        if (!username || username.length < 1) {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(null);
          this.mostrandoResultados.set(false);
          return [];
        }
        this.buscando.set(true);
        this.mostrandoResultados.set(true);

        return this.userService.buscarUsuarios(username).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (usuarios: User[]) => {
        this.buscando.set(false);
        if (usuarios && usuarios.length > 0) {
          this.onUsuariosEncontrados(usuarios);
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set('No se encontraron usuarios');
        }
      },
      error: () => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.busquedaError.set('Error al buscar usuarios');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // MODAL POSTS OCULTOS
  // ============================================================
  abrirModalOcultos(): void {
    if (this.cantidadOcultos() === 0) return;
    this.mostrarModalOcultos.set(true);
  }

  cerrarModalOcultos(): void {
    this.mostrarModalOcultos.set(false);
  }

  confirmarMostrarOcultos(): void {
    if (this.cantidadOcultos() === 0) {
      this.cerrarModalOcultos();
      return;
    }

    this.postsOcultos.mostrarTodos();
    this.cerrarModalOcultos();
    this.exitoMsg.set('Posts ocultos restaurados correctamente');
    setTimeout(() => this.exitoMsg.set(null), 3000);
  }

  /** Mantenido por compatibilidad: ahora abre el modal */
  mostrarTodosLosOcultos(): void {
    this.abrirModalOcultos();
  }

  // ============================================================
  // ELIMINAR CUENTA
  // ============================================================
  abrirModalEliminar(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para eliminar tu cuenta.');
      return;
    }
    this.confirmacionTexto.set('');
    this.mostrarModalEliminar.set(true);
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar.set(false);
    this.confirmacionTexto.set('');
  }

  confirmarEliminarCuenta(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para eliminar tu cuenta.');
      return;
    }
    if (this.confirmacionTexto().trim().toUpperCase() !== 'ELIMINAR') return;

    this.cargando.set(true);
    this.http.delete(`${environment.apiUrl}/usuarios/me`).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cerrarModalEliminar();
        alert('Tu cuenta ha sido eliminada correctamente. Serás redirigido al inicio.');
        this.authService.logout();
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set('Error al eliminar la cuenta: ' + (err.error?.error || 'Inténtalo de nuevo.'));
        setTimeout(() => this.errorMsg.set(null), 5000);
        this.cerrarModalEliminar();
      }
    });
  }

  // ============================================================
  // ESTADO DE RELACIÓN
  // ============================================================
  getEstadoRelacion(usuarioId: number): EstadoRelacion {
    if (this.esMiPropioPerfil(usuarioId)) return 'YO_MISMO';
    return this.estadosRelacion().get(usuarioId) || 'DESCONOCIDO';
  }

  sonContactos(usuarioId: number): boolean {
    return this.getEstadoRelacion(usuarioId) === 'CONTACTO';
  }

  yaEnvieSolicitud(usuarioId: number): boolean {
    const estado = this.getEstadoRelacion(usuarioId);
    return estado === 'SOLICITUD_ENVIADA' || this.solicitudEnviada() === usuarioId;
  }

  esMiPropioPerfil(usuarioId: number): boolean {
    return this.usuario()?.id === usuarioId;
  }

  private consultarEstadoRelacion(usuarioId: number): void {
    if (this.estadosRelacion().has(usuarioId)) return;

    this.estadosRelacion.update(map => {
      const nuevo = new Map(map);
      nuevo.set(usuarioId, 'DESCONOCIDO');
      return nuevo;
    });

    this.chatService.sonContactos(usuarioId).subscribe({
      next: (respuesta: any) => {
        let esContacto = false;
        if (typeof respuesta === 'boolean') esContacto = respuesta;
        else if (respuesta && typeof respuesta === 'object' && 'sonContactos' in respuesta) {
          esContacto = respuesta.sonContactos;
        }

        this.estadosRelacion.update(map => {
          const nuevo = new Map(map);
          nuevo.set(usuarioId, esContacto ? 'CONTACTO' : 'DESCONOCIDO');
          return nuevo;
        });
      },
      error: () => {}
    });
  }

  private onUsuariosEncontrados(usuarios: User[]): void {
    this.usuariosEncontrados.set(usuarios);
    this.usuarioBuscado.set(null);
    this.busquedaError.set(null);
    if (usuarios.length === 1) this.usuarioBuscado.set(usuarios[0]);

    usuarios.forEach(u => {
      if (u.id && !this.esMiPropioPerfil(u.id)) {
        this.consultarEstadoRelacion(u.id);
      }
    });
  }

  // ============================================================
  // NAVEGACIÓN ENTRE SECCIONES
  // ============================================================
  irASeccion(seccion: SeccionActiva): void {
    this.seccionActiva.set(seccion);

    if (seccion === 'bloqueados') {
      this.cargarBloqueados();
    }

    setTimeout(() => {
      const element = document.getElementById(seccion);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  // ============================================================
  // BLOQUEADOS
  // ============================================================
  cargarBloqueados(): void {
    this.cargandoBloqueados.set(true);
    this.bloqueoService.listarBloqueados().subscribe({
      next: (data) => {
        this.bloqueados.set(data || []);
        this.cargandoBloqueados.set(false);
      },
      error: (err) => {
        console.error('Error al cargar bloqueados:', err);
        this.cargandoBloqueados.set(false);
      }
    });
  }

  desbloquear(usuarioId: number, nombreUsuario: string): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para gestionar bloqueados.');
      return;
    }
    if (!confirm(`¿Desbloquear a @${nombreUsuario}? Volverán a poder enviarse mensajes.`)) return;

    this.bloqueoService.desbloquear(usuarioId).subscribe({
      next: () => {
        this.exitoMsg.set(`@${nombreUsuario} desbloqueado correctamente`);
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cargarBloqueados();
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.error || 'Error al desbloquear');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  formatearFecha(fecha: string | Date): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ============================================================
  // APLICAR TEMA GLOBAL
  // ============================================================
  aplicarTemaGlobal(themeId: string): void {
    const html = document.documentElement;
    const body = document.body;

    const limpiar = (el: HTMLElement) => {
      el.removeAttribute('data-theme');
      Array.from(el.classList)
        .filter(c => c.startsWith('tema-'))
        .forEach(c => el.classList.remove(c));
    };

    limpiar(html);
    limpiar(body);

    const tema = themeId && themeId !== 'default' ? themeId : 'default';
    html.setAttribute('data-theme', tema);
    html.classList.add(`tema-${tema}`);
    body.setAttribute('data-theme', tema);
    body.classList.add(`tema-${tema}`);
  }

  // ============================================================
  // TOGGLES
  // ============================================================
  toggleThemeSelector(): void {
    this.showThemeSelector.update(v => !v);
    this.showFrameSelector.set(false);
    this.showBackgroundSelector.set(false);
    this.showFontSizeSelector.set(false);
  }

  toggleFrameSelector(): void {
    this.showFrameSelector.update(v => !v);
    this.showThemeSelector.set(false);
    this.showBackgroundSelector.set(false);
    this.showFontSizeSelector.set(false);
  }

  toggleBackgroundSelector(): void {
    this.showBackgroundSelector.update(v => !v);
    this.showThemeSelector.set(false);
    this.showFrameSelector.set(false);
    this.showFontSizeSelector.set(false);
  }

  toggleFontSizeSelector(): void {
    this.showFontSizeSelector.update(v => !v);
    this.showThemeSelector.set(false);
    this.showFrameSelector.set(false);
    this.showBackgroundSelector.set(false);
  }

  // ============================================================
  // ESCALA DE FUENTE
  // ============================================================
  seleccionarTamanoFuente(valor: number): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el tamaño de texto.');
      return;
    }
    this.personalizacionStore.setEscalaFuente(valor);
    this.exitoMsg.set(`Tamaño de texto: ${this.personalizacionStore.etiquetaEscala()}`);
    setTimeout(() => this.exitoMsg.set(null), 2000);
  }

  esTamanoActivo(valor: number): boolean {
    return this.personalizacionStore.esPresetActivo(valor);
  }

  ajustarFuente(delta: number): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el tamaño de texto.');
      return;
    }
    this.personalizacionStore.ajustarEscala(delta);
  }

  resetearFuente(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el tamaño de texto.');
      return;
    }
    this.personalizacionStore.resetearEscala();
    this.exitoMsg.set('Tamaño de texto restablecido');
    setTimeout(() => this.exitoMsg.set(null), 2000);
  }

  onSliderFuenteChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = parseFloat(input.value);
    this.personalizacionStore.setEscalaFuente(valor);
  }

  onInputPorcentajeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = parseFloat(input.value) / 100;
    if (!isNaN(valor)) this.personalizacionStore.setEscalaFuente(valor);
  }

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  onBusquedaChange(): void {
    const query = this.busquedaUsuario().trim();
    if (query.startsWith('@')) {
      this.busquedaSubject.next(query.substring(1));
    } else {
      this.busquedaSubject.next(query);
    }
  }

  buscarUsuario(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para buscar usuarios.');
      return;
    }
    const query = this.busquedaUsuario().trim();
    if (!query) {
      this.busquedaError.set('Ingresa un nombre de usuario');
      return;
    }
    const username = query.startsWith('@') ? query.substring(1) : query;
    this.buscando.set(true);
    this.busquedaError.set(null);
    this.mostrandoResultados.set(true);

    this.userService.buscarUsuarios(username).pipe(
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (usuarios: User[]) => {
        this.buscando.set(false);
        if (usuarios && usuarios.length > 0) {
          this.onUsuariosEncontrados(usuarios);
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(`No se encontraron usuarios con "${username}"`);
        }
      },
      error: () => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.busquedaError.set('Error al buscar usuarios');
      }
    });
  }

  limpiarBusqueda(): void {
    this.busquedaUsuario.set('');
    this.usuarioBuscado.set(null);
    this.usuariosEncontrados.set([]);
    this.busquedaError.set(null);
    this.mostrandoResultados.set(false);
    this.solicitudEnviada.set(null);
  }

  verPerfilUsuario(usuarioId: number | undefined): void {
    if (usuarioId) this.router.navigate(['/usuario', usuarioId]);
  }

  enviarMensaje(usuarioId: number | undefined): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para enviar mensajes.');
      return;
    }
    if (usuarioId) this.router.navigate(['/chat', usuarioId]);
  }

  enviarSolicitud(usuarioId: number): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para enviar solicitudes.');
      return;
    }
    if (!usuarioId) return;

    this.enviandoSolicitud.set(true);
    this.userService.enviarSolicitudContacto(usuarioId).subscribe({
      next: () => {
        this.enviandoSolicitud.set(false);
        this.solicitudEnviada.set(usuarioId);
        this.estadosRelacion.update(map => {
          const nuevo = new Map(map);
          nuevo.set(usuarioId, 'SOLICITUD_ENVIADA');
          return nuevo;
        });
        this.exitoMsg.set('Solicitud de contacto enviada correctamente');
        setTimeout(() => {
          this.exitoMsg.set(null);
          this.solicitudEnviada.set(null);
        }, 3000);
      },
      error: (error) => {
        this.enviandoSolicitud.set(false);
        const mensaje = error.error?.mensaje || error.error?.error || 'Error al enviar solicitud';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ============================================================
  // PERSONALIZACIÓN
  // ============================================================
  seleccionarTheme(themeId: string): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el tema.');
      return;
    }
    this.selectedTheme.set(themeId);
    this.aplicarTemaGlobal(themeId);
  }

  seleccionarFrame(frameId: string): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el marco.');
      return;
    }
    this.selectedFrame.set(frameId);
  }

  seleccionarBackground(bgId: string): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para cambiar el fondo.');
      return;
    }
    this.selectedBackground.set(bgId);
  }

  aplicarPersonalizacion(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para guardar tus preferencias.');
      return;
    }
    this.cargando.set(true);
    const temaId = this.selectedTheme();
    const marcoId = this.selectedFrame();
    const fondoId = this.selectedBackground();

    this.aplicarTemaGlobal(temaId);
    this.personalizacionStore.guardarPersonalizacion(temaId, marcoId, fondoId);

    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Personalización aplicada correctamente');
      this.personalizacionStore.recargar();
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 800);
  }

  // ============================================================
  // PERFIL
  // ============================================================
  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formPerfil.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
        bio: user.bio || '',
      });
    }
  }

  toggleEditarPerfil(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para editar tu perfil.');
      return;
    }
    this.editandoPerfil.update(v => !v);
    if (this.editandoPerfil()) this.cargarDatosUsuario();
  }

  guardarPerfil(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para guardar tu perfil.');
      return;
    }
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      return;
    }

    const usuarioId = this.usuario()?.id;
    if (!usuarioId) {
      this.errorMsg.set('Usuario no identificado');
      return;
    }

    this.cargando.set(true);
    const data = this.formPerfil.getRawValue();

    this.userService.actualizarPerfil(usuarioId, {
      nombreUsuario: data.nombreUsuario!,
      email: data.email!,
      bio: data.bio || ''
    }).subscribe({
      next: (usuarioActualizado) => {
        this.authService.usuario.set(usuarioActualizado);
        this.cargando.set(false);
        this.exitoMsg.set('Perfil actualizado correctamente');
        this.editandoPerfil.set(false);
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        console.error('Error al actualizar perfil:', err);
        this.cargando.set(false);
        this.errorMsg.set(err?.error?.error || 'Error al actualizar el perfil');
        setTimeout(() => this.errorMsg.set(null), 4000);
      }
    });
  }

  async subirFotoPerfil(event: Event): Promise<void> {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para subir una foto de perfil.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    const input = event.target as HTMLInputElement;
    const archivoOriginal = input.files?.[0];
    if (!archivoOriginal) return;

    if (!archivoOriginal.type.startsWith('image/')) {
      this.errorMsg.set('Solo se permiten imágenes');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    if (archivoOriginal.size > 10 * 1024 * 1024) {
      this.errorMsg.set('La imagen no debe superar los 10MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    try {
      const archivoLimpio = await this.imageSanitizer.limpiarFotoPerfil(archivoOriginal);
      this.cargando.set(true);

      this.personalizacionService.subirFotoPerfil(archivoLimpio).subscribe({
        next: (data) => {
          const user = this.usuario();
          if (user) this.authService.usuario.set({ ...user, fotoPerfilUrl: data.fotoPerfilUrl });
          this.exitoMsg.set('Foto de perfil actualizada');
          this.cargando.set(false);
          this.personalizacionStore.recargar();
          setTimeout(() => this.exitoMsg.set(null), 3000);
        },
        error: () => {
          this.errorMsg.set('Error al subir la foto');
          this.cargando.set(false);
          setTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      this.errorMsg.set('Error al procesar la imagen');
      setTimeout(() => this.errorMsg.set(null), 3000);
    } finally {
      input.value = '';
    }
  }

  getInitials(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }

  irChat(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para entrar al chat.');
      return;
    }
    this.router.navigate(['/chat']);
  }

  irPerfil(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para ver tu perfil.');
      return;
    }
    this.router.navigate(['/perfil']);
  }

  irHistorial(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para ver tu historial.');
      return;
    }
    this.router.navigate(['/mis-publicaciones']);
  }

  abrirAyudaAtajos(): void {
    this.shortcuts.mostrarAyuda.set(true);
  }
}