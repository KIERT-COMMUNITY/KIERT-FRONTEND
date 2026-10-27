// src/app/features/chat/chat.component.ts
import {
  Component, OnInit, signal, inject, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked, computed, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { PresenciaService, PresenciaUsuario } from '../../core/services/presencia.service';
import { GrupoService, Grupo, MensajeGrupo, MiembroGrupo } from '../../core/services/grupo.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import {
  Conversacion, Mensaje, SolicitudContacto, MensajeArchivo, UsuarioDisponible
} from '../../core/models/chat.model';
import { Sticker } from '../../core/models/sticker.model';
import { AvatarFrameComponent } from '../../shared/components/avatar-frame/avatar-frame.component';
import { CrearGrupoModalComponent } from '../../shared/components/crear-grupo-modal/crear-grupo-modal.component';
import { StickerPickerComponent } from '../../shared/components/sticker-picker/sticker-picker.component';
import { AvisoLoginComponent } from '../../shared/components/aviso-login/aviso-login.component';
import { BienvenidaService, Bienvenida } from '../../core/services/bienvenida.service';

type TabTipo = 'chats' | 'grupos';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, AvatarFrameComponent,
    CrearGrupoModalComponent, StickerPickerComponent,
    AvisoLoginComponent
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private presenciaService = inject(PresenciaService);
  private grupoService = inject(GrupoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private ngZone = inject(NgZone);
  private bienvenidaService = inject(BienvenidaService);
  public personalizacionStore = inject(PersonalizacionStore);

  @ViewChild('mensajesContainer') private mensajesContainer?: ElementRef;
  @ViewChild('mensajesGrupoContainer') private mensajesGrupoContainer?: ElementRef;

  tabActual = signal<TabTipo>('chats');
  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);
  cargando = signal(false);

  grupos = signal<Grupo[]>([]);
  grupoSeleccionado = signal<number | null>(null);
  mensajesGrupo = signal<MensajeGrupo[]>([]);
  miembros = signal<MiembroGrupo[]>([]);
  cargandoGrupo = signal(false);
  enviandoGrupo = signal(false);

  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  enviando = signal(false);
  archivosSeleccionados = signal<File[]>([]);
  mobileMenuOpen = signal(false);
  solicitudesExpandidas = signal(false);
  mostrarModalGrupo = signal(false);
  mostrarMiembros = signal(false);
  mostrarStickerPicker = signal(false);
  mostrarStickerPickerGrupo = signal(false);
  busqueda = signal<string>('');
  buscadorActivo = signal(false);
  usuariosDisponibles = signal<UsuarioDisponible[]>([]);
  cargandoUsuarios = signal(false);
  mostrarOpcionesGrupo = signal(false);
  mostrarConfirmEliminar = signal(false);
  mostrarConfirmSalir = signal(false);
  mostrarConfirmExpulsar = signal(false);
  grupoAEliminar = signal<Grupo | null>(null);
  miembroAExpulsar = signal<MiembroGrupo | null>(null);

  // Avisos de login
  mostrarAvisoLoginPrivado = signal(false);
  mostrarAvisoLoginGrupo = signal(false);

  // ============ CHAT DE BIENVENIDA (predeterminado) ============
  bienvenidaAbierta = signal(false);
  bienvenida = signal<Bienvenida>({
    titulo: 'Bienvenido a Kiert Community',
    contenido: 'Cargando mensaje de bienvenida...',
    fechaActualizacion: null
  });

  presencias = signal<Map<number, PresenciaUsuario>>(new Map());
  private presenciaInterval: ReturnType<typeof setInterval> | null = null;

  formMensaje = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  formMensajeGrupo = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  get cantidadSolicitudesPendientes(): number {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE').length;
  }

  get solicitudesPendientes(): SolicitudContacto[] {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE');
  }

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  conversacionesFiltradas = computed(() => {
    const query = this.busqueda().toLowerCase().trim();
    if (!query) return this.conversaciones();
    return this.conversaciones().filter(c =>
      c.nombreUsuario?.toLowerCase().includes(query)
    );
  });

  gruposFiltrados = computed(() => {
    const query = this.busqueda().toLowerCase().trim();
    if (!query) return this.grupos();
    return this.grupos().filter(g =>
      g.nombre?.toLowerCase().includes(query)
    );
  });

  usuariosFiltrados = computed(() => {
    const query = this.busqueda().toLowerCase().trim();
    if (!query || query.length < 1) return [];
    return this.usuariosDisponibles().filter(u =>
      u.nombreUsuario?.toLowerCase().includes(query)
    );
  });

  hayResultados = computed(() => {
    return this.conversacionesFiltradas().length > 0
        || this.gruposFiltrados().length > 0
        || this.usuariosFiltrados().length > 0;
  });

  mensajesAgrupados = computed(() => {
    const grupos: { [key: string]: Mensaje[] } = {};
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.mensajes().forEach(msg => {
      const fecha = this.parsearFechaUtc(msg.fechaEnvio) ?? new Date();
      let key: string;
      if (fecha.toDateString() === hoy.toDateString()) key = 'Hoy';
      else if (fecha.toDateString() === ayer.toDateString()) key = 'Ayer';
      else key = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(msg);
    });

    return Object.keys(grupos).map(key => ({ fecha: key, mensajes: grupos[key] }));
  });

  mensajesGrupoAgrupados = computed(() => {
    const grupos: { [key: string]: MensajeGrupo[] } = {};
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.mensajesGrupo().forEach(msg => {
      const fecha = this.parsearFechaUtc(msg.fechaEnvio) ?? new Date();
      let key: string;
      if (fecha.toDateString() === hoy.toDateString()) key = 'Hoy';
      else if (fecha.toDateString() === ayer.toDateString()) key = 'Ayer';
      else key = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(msg);
    });

    return Object.keys(grupos).map(key => ({ fecha: key, mensajes: grupos[key] }));
  });

  private pollingInterval: any;
  private kbListener?: () => void;

  private readonly onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (this.estaLogueado) {
        this.actualizarConversacionesYContadores();
        this.actualizarPresencias();
      }
    }
  };

  constructor() {
    this.chatService.conversaciones$.subscribe(conversaciones => {
      if (conversaciones.length > 0) {
        this.conversaciones.set(conversaciones);
      }
    });
  }

  ngOnInit(): void {
    this.conversaciones.set([]);
    this.mensajes.set([]);
    this.solicitudes.set([]);
    this.usuarioSeleccionado.set(null);
    this.grupoSeleccionado.set(null);

    // ✅ Solo cargamos datos protegidos si está logueado
    if (this.estaLogueado) {
      this.cargarDatos();
      this.cargarGrupos();
    }

    // ✅ La bienvenida es pública → siempre se carga
    this.cargarBienvenida();

    this.setupKeyboardListener();

    this.route.params.subscribe(params => {
      const usuarioId = params['usuarioId'];
      const grupoId = params['grupoId'];
      const bienvenida = params['bienvenida'];

      // ✅ RUTA CHAT DE BIENVENIDA
      if (bienvenida === 'bienvenida') {
        this.tabActual.set('chats');
        this.usuarioSeleccionado.set(null);
        this.grupoSeleccionado.set(null);
        this.bienvenidaAbierta.set(true);
        this.cerrarSidebarMovil();
        return;
      }

      if (usuarioId) {
        if (Number(usuarioId) === this.authService.usuario()?.id) {
          this.router.navigate(['/chat']);
          return;
        }
        this.tabActual.set('chats');
        this.bienvenidaAbierta.set(false);
        const id = Number(usuarioId);
        this.usuarioSeleccionado.set(id);

        // ✅ Solo marcamos leídos y cargamos si está logueado
        if (this.estaLogueado) {
          this.marcarMensajesComoLeidos(id);
          this.cargarMensajes(id);
        }
        this.cerrarSidebarMovil();
      }

      if (grupoId) {
        this.tabActual.set('grupos');
        this.bienvenidaAbierta.set(false);
        const id = Number(grupoId);
        this.grupoSeleccionado.set(id);

        // ✅ Solo cargamos si está logueado
        if (this.estaLogueado) {
          this.cargarMensajesGrupo(id);
          this.cargarMiembros(id);
        }
        this.cerrarSidebarMovil();
      }
    });

    // ✅ Polling solo si está logueado
    this.pollingInterval = setInterval(() => {
      if (this.estaLogueado) {
        this.actualizarConversacionesYContadores();
      }
    }, 8000);

    // ✅ Presencias solo si está logueado
    this.ngZone.runOutsideAngular(() => {
      this.presenciaInterval = setInterval(() => {
        if (document.visibilityState === 'visible' && this.estaLogueado) {
          this.ngZone.run(() => this.actualizarPresencias());
        }
      }, 15000);
    });

    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
    this.scrollToBottomGrupo();
  }

  ngOnDestroy(): void {
    this.teardownKeyboardListener();
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.presenciaInterval) clearInterval(this.presenciaInterval);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);

    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }

    this.bienvenidaAbierta.set(false);

    const usuarioId = this.usuarioSeleccionado();
    if (usuarioId && this.estaLogueado) {
      this.chatService.marcarComoLeidos(usuarioId).subscribe({
        next: () => this.chatService.resetearNoLeidos(usuarioId)
      });
    }
  }

  // ============================================================
  // CHAT DE BIENVENIDA
  // ============================================================
  cargarBienvenida(): void {
    this.bienvenidaService.obtener().subscribe({
      next: (data) => this.bienvenida.set(data),
      error: () => {}
    });
  }

  abrirBienvenida(): void {
    this.tabActual.set('chats');
    this.usuarioSeleccionado.set(null);
    this.grupoSeleccionado.set(null);
    this.mensajes.set([]);
    this.mensajesGrupo.set([]);
    this.bienvenidaAbierta.set(true);
    this.cargarBienvenida();
    this.cerrarSidebarMovil();
    this.router.navigate(['/chat/bienvenida']);
  }

  cerrarBienvenida(): void {
    this.bienvenidaAbierta.set(false);
    this.router.navigate(['/chat']);
  }

  // ============================================================
  // PRESENCIAS / TECLADO / TABS
  // ============================================================
  private actualizarPresencias(): void {
    if (!this.estaLogueado) return;

    const ids = this.conversaciones().map(c => c.usuarioId);
    if (ids.length === 0) return;

    this.presenciaService.obtenerPresenciaMultiple(ids).subscribe({
      next: (presencias) => {
        const map = new Map<number, PresenciaUsuario>();
        presencias.forEach(p => map.set(p.usuarioId, p));
        this.presencias.set(map);
      },
      error: () => {}
    });
  }

  private setupKeyboardListener(): void {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const update = () => {
      const layoutH = window.innerHeight;
      const visibleH = vv.height;
      const offsetTop = vv.offsetTop;
      const bottomInset = Math.max(0, layoutH - visibleH - offsetTop);
      document.documentElement.style.setProperty('--kb-offset', `${bottomInset}px`);
      document.documentElement.style.setProperty('--vv-height', `${visibleH}px`);
    };
    this.kbListener = update;
    this.ngZone.runOutsideAngular(() => {
      vv.addEventListener('resize', update);
      vv.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      window.addEventListener('orientationchange', update);
    });
    update();
  }

  private teardownKeyboardListener(): void {
    if (typeof window === 'undefined' || !this.kbListener) return;
    window.visualViewport?.removeEventListener('resize', this.kbListener);
    window.visualViewport?.removeEventListener('scroll', this.kbListener);
    window.removeEventListener('resize', this.kbListener);
    window.removeEventListener('orientationchange', this.kbListener);
    document.documentElement.style.setProperty('--kb-offset', '0px');
    document.documentElement.style.setProperty('--vv-height', '100dvh');
    this.kbListener = undefined;
  }

  cambiarTab(tab: TabTipo): void {
    this.tabActual.set(tab);
    this.bienvenidaAbierta.set(false);
    if (tab === 'chats') {
      this.grupoSeleccionado.set(null);
      this.mensajesGrupo.set([]);
    } else {
      this.usuarioSeleccionado.set(null);
      this.mensajes.set([]);
    }
  }

  // ============================================================
  // BÚSQUEDA
  // ============================================================
  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.buscadorActivo.set(true);
    // ✅ Solo buscamos usuarios si está logueado
    if (this.estaLogueado && valor.trim().length >= 1) {
      this.cargarUsuariosDisponibles();
    }
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
    this.buscadorActivo.set(false);
    this.usuariosDisponibles.set([]);
  }

  cerrarBuscador(): void { this.buscadorActivo.set(false); }

  cargarUsuariosDisponibles(): void {
    // ✅ Solo si está logueado
    if (!this.estaLogueado) return;
    if (this.cargandoUsuarios()) return;

    this.cargandoUsuarios.set(true);
    this.chatService.listarUsuariosDisponibles().subscribe({
      next: (usuarios) => {
        this.usuariosDisponibles.set(usuarios || []);
        this.cargandoUsuarios.set(false);
      },
      error: () => {
        this.usuariosDisponibles.set([]);
        this.cargandoUsuarios.set(false);
      }
    });
  }

  seleccionarUsuarioNuevo(usuarioId: number): void {
    this.limpiarBusqueda();
    this.router.navigate(['/usuario', usuarioId]);
  }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  cargarDatos(): void {
    // ✅ No llamamos si no está logueado
    if (!this.estaLogueado) {
      this.conversaciones.set([]);
      this.solicitudes.set([]);
      return;
    }
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  recargarDatos(): void {
    if (this.estaLogueado) {
      this.cargarDatos();
      this.cargarGrupos();
    }
    // ✅ La bienvenida siempre es pública
    this.cargarBienvenida();
  }

  cargarConversaciones(): void {
    if (!this.estaLogueado) {
      this.conversaciones.set([]);
      return;
    }
    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        this.conversaciones.set(data);
        this.actualizarPresencias();
      },
      error: () => {}
    });
  }

  actualizarConversacionesYContadores(): void {
    if (!this.estaLogueado) return;
    this.chatService.listarConversaciones().subscribe({
      next: (data) => this.conversaciones.set(data),
      error: () => {}
    });
  }

  cargarMensajes(usuarioId: number): void {
    if (!this.estaLogueado) return;

    this.cargando.set(true);
    this.chatService.listarMensajes(usuarioId).subscribe({
      next: (data) => {
        this.mensajes.set(data);
        this.cargando.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMsg.set('Error al cargar mensajes');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  cargarSolicitudes(): void {
    if (!this.estaLogueado) {
      this.solicitudes.set([]);
      return;
    }
    this.chatService.listarSolicitudes().subscribe({
      next: (data) => this.solicitudes.set(data),
      error: () => {}
    });
  }

  marcarMensajesComoLeidos(usuarioId: number): void {
    if (!this.estaLogueado) return;

    this.conversaciones.update(convs =>
      convs.map(conv =>
        conv.usuarioId === usuarioId ? { ...conv, noLeidos: 0 } : conv
      )
    );
    this.chatService.resetearNoLeidos(usuarioId);
    this.chatService.marcarComoLeidos(usuarioId).subscribe({
      next: () => {},
      error: () => this.cargarConversaciones()
    });
  }

  // ============================================================
  // GRUPOS
  // ============================================================
  cargarGrupos(): void {
    if (!this.estaLogueado) {
      this.grupos.set([]);
      return;
    }
    this.grupoService.misGrupos().subscribe({
      next: (grupos) => this.grupos.set(grupos),
      error: () => {}
    });
  }

  abrirModalGrupo(): void {
    if (!this.estaLogueado) {
      this.errorMsg.set('Debes iniciar sesión para crear un grupo');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.mostrarModalGrupo.set(true);
  }

  cerrarModalGrupo(): void { this.mostrarModalGrupo.set(false); }

  onGrupoCreado(grupo: Grupo): void {
    this.grupos.update(lista => [grupo, ...lista]);
    this.exitoMsg.set(`Grupo "${grupo.nombre}" creado correctamente`);
    setTimeout(() => this.exitoMsg.set(null), 3000);

    setTimeout(() => {
      this.tabActual.set('grupos');
      this.bienvenidaAbierta.set(false);
      this.grupoSeleccionado.set(grupo.id);
      this.cargarMensajesGrupo(grupo.id);
      this.cargarMiembros(grupo.id);
    }, 500);
  }

  seleccionarGrupo(grupoId: number): void {
    this.bienvenidaAbierta.set(false);
    this.grupoSeleccionado.set(grupoId);
    this.usuarioSeleccionado.set(null);
    this.mensajes.set([]);

    if (this.estaLogueado) {
      this.cargarMensajesGrupo(grupoId);
      this.cargarMiembros(grupoId);
    }

    this.cerrarSidebarMovil();
    this.router.navigate(['/chat/grupo', grupoId]);
  }

  cerrarGrupo(): void {
    this.grupoSeleccionado.set(null);
    this.mensajesGrupo.set([]);
    this.miembros.set([]);
    this.mostrarMiembros.set(false);
    this.router.navigate(['/chat']);
  }

  cargarMensajesGrupo(grupoId: number): void {
    if (!this.estaLogueado) return;

    this.cargandoGrupo.set(true);
    this.grupoService.obtenerMensajes(grupoId).subscribe({
      next: (msgs) => {
        this.mensajesGrupo.set(msgs);
        this.cargandoGrupo.set(false);
        setTimeout(() => this.scrollToBottomGrupo(), 100);
      },
      error: () => this.cargandoGrupo.set(false)
    });
  }

  cargarMiembros(grupoId: number): void {
    if (!this.estaLogueado) return;

    this.grupoService.listarMiembros(grupoId).subscribe({
      next: (miembros) => this.miembros.set(miembros),
      error: () => {}
    });
  }

  enviarMensajeGrupo(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginGrupo.set(true);
      return;
    }

    const contenido = this.formMensajeGrupo.value.contenido?.trim();
    const grupoId = this.grupoSeleccionado();
    if (!contenido || !grupoId) return;

    this.enviandoGrupo.set(true);
    this.grupoService.enviarMensaje(grupoId, contenido).subscribe({
      next: (msg) => {
        this.mensajesGrupo.update(lista => [...lista, msg]);
        this.formMensajeGrupo.reset();
        this.enviandoGrupo.set(false);
        setTimeout(() => this.scrollToBottomGrupo(), 100);
      },
      error: () => {
        this.errorMsg.set('Error al enviar mensaje');
        this.enviandoGrupo.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  getGrupoActual(): Grupo | null {
    const id = this.grupoSeleccionado();
    return this.grupos().find(g => g.id === id) || null;
  }

  toggleMiembros(): void {
    this.mostrarMiembros.update(v => !v);
    const grupoId = this.grupoSeleccionado();
    if (grupoId && this.mostrarMiembros() && this.estaLogueado) {
      this.cargarMiembros(grupoId);
    }
  }

  toggleOpcionesGrupo(): void { this.mostrarOpcionesGrupo.update(v => !v); }

  esAdmin(): boolean {
    const grupo = this.getGrupoActual();
    return grupo?.rolDelUsuario === 'ADMIN';
  }

  esCreador(): boolean {
    const grupo = this.getGrupoActual();
    const usuario = this.authService.usuario();
    return grupo?.creadorId === usuario?.id;
  }

  puedeEliminarGrupo(): boolean {
    return this.esAdmin() || this.esCreador();
  }

  grupoActualId(): number {
    return this.grupoSeleccionado() ?? 0;
  }

  abrirConfirmEliminar(): void {
    const grupo = this.getGrupoActual();
    if (!grupo) return;
    this.grupoAEliminar.set(grupo);
    this.mostrarConfirmEliminar.set(true);
    this.mostrarOpcionesGrupo.set(false);
  }

  cerrarConfirmEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.grupoAEliminar.set(null);
  }

  confirmarEliminarGrupo(): void {
    const grupo = this.grupoAEliminar();
    if (!grupo) return;

    this.grupoService.eliminarGrupo(grupo.id).subscribe({
      next: () => {
        this.grupos.update(lista => lista.filter(g => g.id !== grupo.id));
        this.cerrarConfirmEliminar();
        this.cerrarGrupo();
        this.exitoMsg.set(`Grupo "${grupo.nombre}" eliminado`);
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.cerrarConfirmEliminar();
        this.errorMsg.set(err?.error?.error || 'Error al eliminar grupo');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  abrirConfirmSalir(): void {
    this.mostrarConfirmSalir.set(true);
    this.mostrarOpcionesGrupo.set(false);
  }

  cerrarConfirmSalir(): void { this.mostrarConfirmSalir.set(false); }

  confirmarSalirGrupo(): void {
    const grupoId = this.grupoSeleccionado();
    if (!grupoId) return;

    this.grupoService.salirDelGrupo(grupoId).subscribe({
      next: () => {
        this.grupos.update(lista => lista.filter(g => g.id !== grupoId));
        this.cerrarConfirmSalir();
        this.cerrarGrupo();
        this.exitoMsg.set('Saliste del grupo');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.cerrarConfirmSalir();
        this.errorMsg.set(err?.error?.error || 'Error al salir del grupo');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  abrirConfirmExpulsar(miembro: MiembroGrupo): void {
    this.miembroAExpulsar.set(miembro);
    this.mostrarConfirmExpulsar.set(true);
  }

  cerrarConfirmExpulsar(): void {
    this.mostrarConfirmExpulsar.set(false);
    this.miembroAExpulsar.set(null);
  }

  confirmarExpulsarMiembro(): void {
    const grupoId = this.grupoSeleccionado();
    const miembro = this.miembroAExpulsar();
    if (!grupoId || !miembro) return;

    this.grupoService.expulsarMiembro(grupoId, miembro.usuarioId).subscribe({
      next: () => {
        this.miembros.update(lista => lista.filter(m => m.usuarioId !== miembro.usuarioId));
        this.cerrarConfirmExpulsar();
        this.exitoMsg.set(`@${miembro.nombreUsuario} expulsado del grupo`);
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.cerrarConfirmExpulsar();
        this.errorMsg.set(err?.error?.error || 'Error al expulsar miembro');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  toggleSolicitudes(): void { this.solicitudesExpandidas.update(val => !val); }

  aceptarSolicitud(solicitudId: number): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginPrivado.set(true);
      return;
    }
    this.chatService.aceptarSolicitud(solicitudId).subscribe({
      next: () => {
        this.exitoMsg.set('Solicitud aceptada');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cargarDatos();
        const usuarioId = this.usuarioSeleccionado();
        if (usuarioId) this.cargarMensajes(usuarioId);
      },
      error: () => {
        this.errorMsg.set('Error al aceptar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  rechazarSolicitud(solicitudId: number): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginPrivado.set(true);
      return;
    }
    this.chatService.rechazarSolicitud(solicitudId).subscribe({
      next: () => {
        this.exitoMsg.set('Solicitud rechazada');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('Error al rechazar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  seleccionarConversacion(usuarioId: number): void {
    if (usuarioId === this.authService.usuario()?.id) {
      this.errorMsg.set('No puedes chatear contigo mismo');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.bienvenidaAbierta.set(false);
    this.usuarioSeleccionado.set(usuarioId);
    this.grupoSeleccionado.set(null);
    this.mensajesGrupo.set([]);

    if (this.estaLogueado) {
      this.marcarMensajesComoLeidos(usuarioId);
      this.cargarMensajes(usuarioId);
    }

    this.cerrarSidebarMovil();
    this.router.navigate(['/chat', usuarioId]);
  }

  cerrarChat(): void {
    this.usuarioSeleccionado.set(null);
    this.mensajes.set([]);
    this.router.navigate(['/chat']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(val => !val);
    this.aplicarBloqueoScrollBody();
  }

  private cerrarSidebarMovil(): void {
    this.mobileMenuOpen.set(false);
    this.aplicarBloqueoScrollBody();
  }

  private aplicarBloqueoScrollBody(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
  }

  // ============================================================
  // ENVÍO PRIVADO
  // ============================================================
  enviarMensaje(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginPrivado.set(true);
      return;
    }

    const receptorId = this.usuarioSeleccionado();
    if (!receptorId) {
      this.errorMsg.set('Selecciona un usuario para chatear');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    const contenido = this.formMensaje.getRawValue().contenido || '';
    const archivos = this.archivosSeleccionados();

    if (!contenido.trim() && archivos.length === 0) {
      this.errorMsg.set('Escribe un mensaje o adjunta un archivo');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.enviando.set(true);

    if (archivos.length > 0) {
      const formData = new FormData();
      formData.append('contenido', contenido);
      archivos.forEach(archivo => formData.append('archivos', archivo));

      this.chatService.enviarMensajeConArchivos(receptorId, formData).subscribe({
        next: (nuevoMensaje) => {
          this.mensajes.update(lista => [...lista, nuevoMensaje]);
          this.formMensaje.reset();
          this.archivosSeleccionados.set([]);
          this.enviando.set(false);
          this.cargarConversaciones();
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          this.enviando.set(false);
          const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar mensaje';
          this.errorMsg.set(mensaje);
          setTimeout(() => this.errorMsg.set(null), 5000);
        }
      });
    } else {
      this.chatService.enviarMensaje(receptorId, contenido).subscribe({
        next: (nuevoMensaje) => {
          this.mensajes.update(lista => [...lista, nuevoMensaje]);
          this.formMensaje.reset();
          this.enviando.set(false);
          this.cargarConversaciones();
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err) => {
          this.enviando.set(false);
          const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar mensaje';
          this.errorMsg.set(mensaje);
          setTimeout(() => this.errorMsg.set(null), 5000);
        }
      });
    }
  }

  toggleStickerPicker(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginPrivado.set(true);
      return;
    }
    this.mostrarStickerPicker.update(v => !v);
  }

  toggleStickerPickerGrupo(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLoginGrupo.set(true);
      return;
    }
    this.mostrarStickerPickerGrupo.update(v => !v);
  }

  onStickerSeleccionado(sticker: Sticker): void {
    const receptorId = this.usuarioSeleccionado();
    if (!receptorId) return;
    this.mostrarStickerPicker.set(false);
    this.enviando.set(true);

    this.chatService.enviarSticker(receptorId, sticker.id).subscribe({
      next: (nuevoMensaje) => {
        this.mensajes.update(lista => [...lista, nuevoMensaje]);
        this.enviando.set(false);
        this.cargarConversaciones();
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => {
        this.enviando.set(false);
        const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar sticker';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 4000);
      }
    });
  }

  onStickerSeleccionadoGrupo(sticker: Sticker): void {
    const grupoId = this.grupoSeleccionado();
    if (!grupoId) return;
    this.mostrarStickerPickerGrupo.set(false);
    this.enviandoGrupo.set(true);

    this.grupoService.enviarSticker(grupoId, sticker.id).subscribe({
      next: (msg) => {
        this.mensajesGrupo.update(lista => [...lista, msg]);
        this.enviandoGrupo.set(false);
        setTimeout(() => this.scrollToBottomGrupo(), 100);
      },
      error: (err) => {
        this.enviandoGrupo.set(false);
        const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar sticker';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 4000);
      }
    });
  }

  abrirCrearSticker(): void {}

  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const archivos = Array.from(input.files);
    const totalSize = archivos.reduce((acc, f) => acc + f.size, 0);

    if (totalSize > 15 * 1024 * 1024) {
      this.errorMsg.set('El tamaño total no debe superar los 15MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    this.archivosSeleccionados.update(lista => [...lista, ...archivos]);
    input.value = '';
  }

  quitarArchivo(index: number): void {
    this.archivosSeleccionados.update(lista => lista.filter((_, i) => i !== index));
  }

  esImagen(archivo: MensajeArchivo): boolean {
    if (archivo.tipo === 'imagen') return true;
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const nombre = archivo.nombre.toLowerCase();
    return extensiones.some(ext => nombre.endsWith(ext));
  }

  abrirArchivo(url: string): void {
    window.open(url, '_blank');
  }

  scrollToBottom(): void {
    try {
      if (this.mensajesContainer) {
        this.mensajesContainer.nativeElement.scrollTop =
          this.mensajesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  scrollToBottomGrupo(): void {
    try {
      if (this.mensajesGrupoContainer) {
        this.mensajesGrupoContainer.nativeElement.scrollTop =
          this.mensajesGrupoContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  irAlPerfil(usuarioId: number): void {
    this.router.navigate(['/usuario', usuarioId]);
  }

  irALogin(): void {
    this.mostrarAvisoLoginPrivado.set(false);
    this.mostrarAvisoLoginGrupo.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAvisoLoginPrivado(): void { this.mostrarAvisoLoginPrivado.set(false); }
  cerrarAvisoLoginGrupo(): void   { this.mostrarAvisoLoginGrupo.set(false); }

  getNombreUsuario(usuarioId: number): string {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.nombreUsuario || 'Usuario';
  }

  getFotoUsuario(usuarioId: number): string | null {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.fotoPerfilUrl || null;
  }

  getMarcoUsuario(usuarioId: number): string {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.marcoId || 'none';
  }

  private parsearFechaUtc(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const s = String(fecha);
    const tieneZona = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
    return new Date(tieneZona ? s : s + 'Z');
  }

  estaEnLinea(usuarioId: number): boolean {
    const presencia = this.presencias().get(usuarioId);
    if (presencia) return presencia.enLinea;
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.online ?? false;
  }

  getTextoEstado(usuarioId: number): string {
    const presencia = this.presencias().get(usuarioId);
    if (presencia) {
      if (presencia.enLinea) return 'En línea';
      const fecha = this.parsearFechaUtc(presencia.ultimaConexion);
      if (!fecha) return 'Desconectado';
      const diffMs = Date.now() - fecha.getTime();
      if (diffMs < 0) return 'Últ. vez hace unos segundos';
      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMin / 60);
      const diffD = Math.floor(diffH / 24);
      if (diffMin < 1) return 'Últ. vez hace unos segundos';
      if (diffMin < 60) return `Últ. vez hace ${diffMin} min`;
      if (diffH < 24) return `Últ. vez hace ${diffH} h`;
      if (diffD < 7) return `Últ. vez hace ${diffD} d`;
      return `Últ. vez ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
    }

    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    if (!conv) return 'Desconocido';
    if (conv.online) return 'En línea';

    const fecha = this.parsearFechaUtc(conv.ultimaConexion);
    if (!fecha) return 'Desconectado';

    const diffMs = Date.now() - fecha.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Últ. vez hace unos segundos';
    if (diffMin < 60) return `Últ. vez hace ${diffMin} min`;
    if (diffH < 24) return `Últ. vez hace ${diffH} h`;
    if (diffD < 7) return `Últ. vez hace ${diffD} d`;

    return `Últ. vez ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  }

  getEstadoMiembro(m: MiembroGrupo): string {
    if (m.enLinea) return 'En línea';

    const fecha = this.parsearFechaUtc(m.ultimaConexion);
    if (!fecha) return 'Desconectado';

    const diffMs = Date.now() - fecha.getTime();
    if (diffMs < 0) return 'Últ. vez hace unos segundos';

    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Últ. vez hace unos segundos';
    if (diffMin < 60) return `Últ. vez hace ${diffMin} min`;
    if (diffH < 24) return `Últ. vez hace ${diffH} h`;
    if (diffD < 7) return `Últ. vez hace ${diffD} d`;

    return `Últ. vez ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
  }
}