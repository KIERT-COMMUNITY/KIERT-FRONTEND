// src/app/features/chat/grupo-chat/grupo-chat.component.ts
import {
  Component, OnInit, OnDestroy, signal, inject,
  ViewChild, ElementRef, AfterViewChecked, computed, isDevMode
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { GrupoService, Grupo, MensajeGrupo, MiembroGrupo } from '../../../core/services/grupo.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { Conversacion, SolicitudContacto } from '../../../core/models/chat.model';
import { Sticker } from '../../../core/models/sticker.model';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';
import { CrearGrupoModalComponent } from '../../../shared/components/crear-grupo-modal/crear-grupo-modal.component';
import { InvitarLinkModalComponent } from '../../../shared/components/invitacion-modal/invitar-link-modal.component';
import { GrupoInfoModalComponent } from '../../../shared/components/grupo-info-modal/grupo-info-modal.component';
import { StickerPickerComponent } from '../../../shared/components/sticker-picker/sticker-picker.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import { safeUrl, openExternalSafe } from '../../../shared/utils/url-sanitizer';

type TabTipo = 'chats' | 'grupos';

@Component({
  selector: 'kiert-grupo-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AvatarFrameComponent,
    CrearGrupoModalComponent,
    InvitarLinkModalComponent,
    GrupoInfoModalComponent,
    StickerPickerComponent,
    AvisoLoginComponent
  ],
  templateUrl: './grupo-chat.component.html',
  styleUrl: './grupo-chat.component.scss'
})
export class GrupoChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private grupoService = inject(GrupoService);
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private personalizacionStore = inject(PersonalizacionStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  @ViewChild('mensajesContainer') private mensajesContainer?: ElementRef;

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // ===== ESTADO =====
  tabActual = signal<TabTipo>('grupos');

  conversaciones = signal<Conversacion[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);

  grupos = signal<Grupo[]>([]);
  grupoSeleccionado = signal<number | null>(null);
  grupo = signal<Grupo | null>(null);
  mensajes = signal<MensajeGrupo[]>([]);
  miembros = signal<MiembroGrupo[]>([]);

  cargando = signal(false);
  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  mobileMenuOpen = signal(false);
  solicitudesExpandidas = signal(false);
  mostrarModalGrupo = signal(false);
  mostrarMiembros = signal(false);
  mostrarInvitarLink = signal(false);
  mostrarInfoGrupo = signal(false);

  mostrarAvisoLogin = signal(false);

  mostrarStickerPicker = signal(false);

  busqueda = signal<string>('');
  buscadorActivo = signal(false);

  mostrarOpcionesGrupo = signal(false);
  mostrarConfirmEliminar = signal(false);
  mostrarConfirmSalir = signal(false);
  mostrarConfirmExpulsar = signal(false);
  grupoAEliminar = signal<Grupo | null>(null);
  miembroAExpulsar = signal<MiembroGrupo | null>(null);

  // ===== LIMITES =====
  private readonly MAX_ARCHIVOS = 10;
  private readonly MAX_TOTAL_BYTES = 15 * 1024 * 1024;

  formMensaje = this.fb.group({
    contenido: ['', [Validators.minLength(1), Validators.maxLength(2000)]]
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

  hayResultados = computed(() =>
    this.conversacionesFiltradas().length > 0 ||
    this.gruposFiltrados().length > 0
  );

  mensajesAgrupados = computed(() => {
    const grupos: { [key: string]: MensajeGrupo[] } = {};
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

  constructor() {
    this.chatService.conversaciones$
      .pipe(takeUntil(this.destroy$))
      .subscribe(conversaciones => {
        if (conversaciones.length > 0) this.conversaciones.set(conversaciones);
      });
  }

  ngOnInit(): void {
    this.mensajes.set([]);
    this.miembros.set([]);
    this.grupo.set(null);
    this.grupoSeleccionado.set(null);
    this.usuarioSeleccionado.set(null);

    this.cargarDatos();
    this.cargarGrupos();

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const grupoId = params['id'] || params['grupoId'];
        if (grupoId) {
          const id = Number(grupoId);
          if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
            this.router.navigate(['/chat']);
            return;
          }
          this.tabActual.set('grupos');
          this.grupoSeleccionado.set(id);
          this.cargarGrupo(id);
          this.cargarMensajes(id);
          this.cargarMiembros(id);
          this.mobileMenuOpen.set(false);
        }
      });

    this.pollingInterval = setInterval(() => {
      const gid = this.grupoSeleccionado();
      if (gid && this.tabActual() === 'grupos') {
        this.cargarMensajes(gid);
      }
    }, 10000);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  // ============================================================
  // HELPERS DE URL PARA EL TEMPLATE
  // ============================================================
  getFotoConversacion(url: string | null | undefined): string | null { return safeUrl(url); }
  getFotoGrupo(url: string | null | undefined): string | null { return safeUrl(url); }
  getFotoSolicitud(url: string | null | undefined): string | null { return safeUrl(url); }
  getFotoMiembro(url: string | null | undefined): string | null { return safeUrl(url); }
  getFotoMensaje(url: string | null | undefined): string | null { return safeUrl(url); }
  getStickerUrl(url: string | null | undefined): string | null { return safeUrl(url); }
  getArchivoUrl(url: string | null | undefined): string | null { return safeUrl(url); }

  // ============================================================
  // TABS
  // ============================================================
  cambiarTab(tab: TabTipo): void {
    this.tabActual.set(tab);
    if (tab === 'chats') {
      this.grupoSeleccionado.set(null);
      this.grupo.set(null);
      this.mensajes.set([]);
      this.miembros.set([]);
    } else {
      this.usuarioSeleccionado.set(null);
    }
  }

  // ============================================================
  // BUSQUEDA
  // ============================================================
  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
    this.buscadorActivo.set(true);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
    this.buscadorActivo.set(false);
  }

  cerrarBuscador(): void {
    this.buscadorActivo.set(false);
  }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  cargarDatos(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  recargarDatos(): void {
    this.cargarDatos();
    this.cargarGrupos();
  }

  cargarConversaciones(): void {
    this.chatService.listarConversaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.conversaciones.set(Array.isArray(data) ? data : []),
        error: () => {}
      });
  }

  actualizarConversacionesYContadores(): void {
    this.chatService.listarConversaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.conversaciones.set(Array.isArray(data) ? data : []),
        error: () => {}
      });
  }

  cargarSolicitudes(): void {
    this.chatService.listarSolicitudes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.solicitudes.set(Array.isArray(data) ? data : []),
        error: () => {}
      });
  }

  cargarGrupos(): void {
    this.grupoService.misGrupos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (grupos) => this.grupos.set(Array.isArray(grupos) ? grupos : []),
        error: () => {}
      });
  }

  cargarGrupo(grupoId: number): void {
    this.grupoService.obtenerGrupo(grupoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (g) => this.grupo.set(g),
        error: () => {
          this.errorMsg.set('Error al cargar el grupo');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
          this.router.navigate(['/chat']);
        }
      });
  }

  cargarMensajes(grupoId: number): void {
    if (!this.grupoSeleccionado() || grupoId !== this.grupoSeleccionado()) return;

    this.cargando.set(true);
    this.grupoService.obtenerMensajes(grupoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msgs) => {
          this.mensajes.set(Array.isArray(msgs) ? msgs : []);
          this.cargando.set(false);
          this.safeTimeout(() => this.scrollToBottom(), 100);
        },
        error: () => {
          this.cargando.set(false);
          this.errorMsg.set('Error al cargar mensajes');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  cargarMiembros(grupoId: number): void {
    this.grupoService.listarMiembros(grupoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (miembros) => this.miembros.set(Array.isArray(miembros) ? miembros : []),
        error: () => {}
      });
  }

  // ============================================================
  // GRUPOS - ACCIONES
  // ============================================================
  abrirModalGrupo(): void { this.mostrarModalGrupo.set(true); }
  cerrarModalGrupo(): void { this.mostrarModalGrupo.set(false); }

  onGrupoCreado(grupo: Grupo): void {
    this.grupos.update(lista => [grupo, ...lista]);
    this.exitoMsg.set(`Grupo "${grupo.nombre}" creado correctamente`);
    this.safeTimeout(() => this.exitoMsg.set(null), 3000);

    this.safeTimeout(() => {
      this.tabActual.set('grupos');
      this.grupoSeleccionado.set(grupo.id);
      this.cargarGrupo(grupo.id);
      this.cargarMensajes(grupo.id);
      this.cargarMiembros(grupo.id);

      this.safeTimeout(() => this.mostrarInvitarLink.set(true), 400);
    }, 500);
  }

  seleccionarGrupo(grupoId: number): void {
    if (!Number.isFinite(grupoId) || !Number.isInteger(grupoId) || grupoId <= 0) return;
    if (this.grupoSeleccionado() === grupoId) return;

    this.grupoSeleccionado.set(grupoId);
    this.usuarioSeleccionado.set(null);
    this.grupo.set(null);
    this.mensajes.set([]);
    this.miembros.set([]);

    this.cargarGrupo(grupoId);
    this.cargarMensajes(grupoId);
    this.cargarMiembros(grupoId);
    this.mobileMenuOpen.set(false);

    const urlActual = this.router.url;
    if (!urlActual.includes(`/chat/grupo/${grupoId}`)) {
      this.router.navigate(['/chat/grupo', grupoId]);
    }
  }

  cerrarGrupo(): void {
    this.grupoSeleccionado.set(null);
    this.grupo.set(null);
    this.mensajes.set([]);
    this.miembros.set([]);
    this.mostrarMiembros.set(false);
    this.mostrarOpcionesGrupo.set(false);
    this.router.navigate(['/chat']);
  }

  seleccionarConversacion(usuarioId: number): void {
    if (usuarioId === this.authService.usuario()?.id) {
      this.errorMsg.set('No puedes chatear contigo mismo');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.usuarioSeleccionado.set(usuarioId);
    this.grupoSeleccionado.set(null);
    this.grupo.set(null);
    this.mensajes.set([]);
    this.tabActual.set('chats');
    this.mobileMenuOpen.set(false);
    this.router.navigate(['/chat', usuarioId]);
  }

  toggleMiembros(): void {
    this.mostrarMiembros.update(val => !val);
    const grupoId = this.grupoSeleccionado();
    if (grupoId && this.mostrarMiembros()) this.cargarMiembros(grupoId);
  }

  // ============================================================
  // INFO DEL GRUPO
  // ============================================================
  abrirInfoGrupo(): void {
    this.mostrarOpcionesGrupo.set(false);
    this.mostrarInfoGrupo.set(true);
  }

  cerrarInfoGrupo(): void { this.mostrarInfoGrupo.set(false); }

  onGrupoActualizado(g: Grupo): void {
    this.grupo.set(g);
    this.grupos.update(lista => lista.map(x => x.id === g.id ? g : x));
  }

  abrirInvitarLink(): void {
    this.mostrarInvitarLink.set(true);
    this.mostrarOpcionesGrupo.set(false);
  }

  cerrarInvitarLink(): void { this.mostrarInvitarLink.set(false); }

  toggleOpcionesGrupo(): void {
    this.mostrarOpcionesGrupo.update(v => !v);
  }

  cerrarOpcionesGrupo(): void {
    this.mostrarOpcionesGrupo.set(false);
  }

  esAdmin(): boolean {
    return this.grupo()?.rolDelUsuario === 'ADMIN';
  }

  esCreador(): boolean {
    const g = this.grupo();
    const usuario = this.authService.usuario();
    return g?.creadorId === usuario?.id;
  }

  puedeEliminarGrupo(): boolean {
    return this.esAdmin() || this.esCreador();
  }

  grupoActualId(): number {
    return this.grupoSeleccionado() ?? 0;
  }

  abrirConfirmEliminar(): void {
    const g = this.grupo();
    if (!g) return;
    this.grupoAEliminar.set(g);
    this.mostrarConfirmEliminar.set(true);
    this.mostrarOpcionesGrupo.set(false);
  }

  cerrarConfirmEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.grupoAEliminar.set(null);
  }

  confirmarEliminarGrupo(): void {
    const g = this.grupoAEliminar();
    if (!g) return;

    this.grupoService.eliminarGrupo(g.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.grupos.update(lista => lista.filter(x => x.id !== g.id));
          this.cerrarConfirmEliminar();
          this.cerrarGrupo();
          this.exitoMsg.set(`Grupo "${g.nombre}" eliminado`);
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
        },
        error: (err) => {
          this.cerrarConfirmEliminar();
          this.errorMsg.set(err?.error?.error || 'Error al eliminar grupo');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
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

    this.grupoService.salirDelGrupo(grupoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.grupos.update(lista => lista.filter(g => g.id !== grupoId));
          this.cerrarConfirmSalir();
          this.cerrarGrupo();
          this.exitoMsg.set('Saliste del grupo');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
        },
        error: (err) => {
          this.cerrarConfirmSalir();
          this.errorMsg.set(err?.error?.error || 'Error al salir del grupo');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
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

    this.grupoService.expulsarMiembro(grupoId, miembro.usuarioId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.miembros.update(lista => lista.filter(m => m.usuarioId !== miembro.usuarioId));
          this.cerrarConfirmExpulsar();
          this.exitoMsg.set(`@${miembro.nombreUsuario} expulsado del grupo`);
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
          this.cargarMensajes(grupoId);
        },
        error: (err) => {
          this.cerrarConfirmExpulsar();
          this.errorMsg.set(err?.error?.error || 'Error al expulsar miembro');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ============================================================
  // ARCHIVOS
  // ============================================================
  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    if (!input.files) { input.value = ''; return; }

    const archivos = Array.from(input.files);
    const actuales = this.archivosSeleccionados();

    if (actuales.length + archivos.length > this.MAX_ARCHIVOS) {
      this.errorMsg.set(`Maximo ${this.MAX_ARCHIVOS} archivos por mensaje`);
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    const totalSize = [...actuales, ...archivos].reduce((acc, f) => acc + f.size, 0);
    if (totalSize > this.MAX_TOTAL_BYTES) {
      this.errorMsg.set('El tamano total no debe superar los 15MB');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    this.archivosSeleccionados.update(lista => [...lista, ...archivos]);
    input.value = '';
  }

  quitarArchivo(index: number): void {
    this.archivosSeleccionados.update(lista => lista.filter((_, i) => i !== index));
  }

  esImagen(nombre: string): boolean {
    if (!nombre) return false;
    const ext = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return ext.some(e => nombre.toLowerCase().endsWith(e));
  }

  esMensajeSistema(msg: MensajeGrupo): boolean {
    return msg.tipoMensaje === 'SISTEMA';
  }

  abrirArchivo(url: string): void {
    openExternalSafe(safeUrl(url));
  }

  // ============================================================
  // STICKERS
  // ============================================================
  toggleStickerPicker(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }
    this.mostrarStickerPicker.update(v => !v);
  }

  onStickerSeleccionado(sticker: Sticker): void {
    const grupoId = this.grupoSeleccionado();
    if (!grupoId) return;

    this.mostrarStickerPicker.set(false);
    this.enviando.set(true);

    this.grupoService.enviarSticker(grupoId, sticker.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (msg: MensajeGrupo) => {
          this.mensajes.update(lista => [...lista, msg]);
          this.enviando.set(false);
          this.safeTimeout(() => this.scrollToBottom(), 100);
        },
        error: (err: any) => {
          this.enviando.set(false);
          const mensaje = err?.error?.error || err?.error?.mensaje || 'Error al enviar sticker';
          this.errorMsg.set(mensaje);
          this.safeTimeout(() => this.errorMsg.set(null), 4000);
        }
      });
  }

  abrirCrearSticker(): void {}

  // ============================================================
  // ENVIO DE MENSAJES
  // ============================================================
  enviarMensaje(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }

    const contenido = (this.formMensaje.value.contenido || '').trim();
    const grupoId = this.grupoSeleccionado();
    const archivos = this.archivosSeleccionados();

    if (!grupoId) return;
    if (!contenido && archivos.length === 0) return;
    if (contenido.length > 2000) {
      this.errorMsg.set('El mensaje no puede superar 2000 caracteres');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.enviando.set(true);

    if (archivos.length > 0) {
      const archivo = archivos[0];
      this.grupoService.enviarMensajeConArchivo(grupoId, contenido, archivo)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (msg) => {
            this.mensajes.update(lista => [...lista, msg]);
            this.formMensaje.reset();
            this.archivosSeleccionados.set([]);
            this.enviando.set(false);
            this.safeTimeout(() => this.scrollToBottom(), 100);
          },
          error: (err) => {
            this.errorMsg.set(err?.error?.error || 'Error al enviar archivo');
            this.enviando.set(false);
            this.safeTimeout(() => this.errorMsg.set(null), 3000);
          }
        });
    } else {
      this.grupoService.enviarMensaje(grupoId, contenido)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (msg) => {
            this.mensajes.update(lista => [...lista, msg]);
            this.formMensaje.reset();
            this.enviando.set(false);
            this.safeTimeout(() => this.scrollToBottom(), 100);
          },
          error: () => {
            this.errorMsg.set('Error al enviar mensaje');
            this.enviando.set(false);
            this.safeTimeout(() => this.errorMsg.set(null), 3000);
          }
        });
    }
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  cerrarAvisoLogin(): void { this.mostrarAvisoLogin.set(false); }

  // ============================================================
  // SOLICITUDES
  // ============================================================
  toggleSolicitudes(): void {
    this.solicitudesExpandidas.update(val => !val);
  }

  aceptarSolicitud(solicitudId: number): void {
    this.chatService.aceptarSolicitud(solicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.exitoMsg.set('Solicitud aceptada');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
          this.cargarDatos();
        },
        error: () => {
          this.errorMsg.set('Error al aceptar solicitud');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  rechazarSolicitud(solicitudId: number): void {
    this.chatService.rechazarSolicitud(solicitudId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.exitoMsg.set('Solicitud rechazada');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
          this.cargarDatos();
        },
        error: () => {
          this.errorMsg.set('Error al rechazar solicitud');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ============================================================
  // MOBILE
  // ============================================================
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(val => !val);
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  scrollToBottom(): void {
    try {
      if (this.mensajesContainer) {
        this.mensajesContainer.nativeElement.scrollTop =
          this.mensajesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  irAlPerfil(usuarioId: number): void {
    if (!Number.isFinite(usuarioId) || !Number.isInteger(usuarioId) || usuarioId <= 0) return;
    if (usuarioId === this.authService.usuario()?.id) {
      this.router.navigate(['/perfil']);
      return;
    }
    this.router.navigate(['/usuario', usuarioId]);
  }

  getNombreUsuario(usuarioId: number): string {
    return this.conversaciones().find(c => c.usuarioId === usuarioId)?.nombreUsuario || 'Usuario';
  }

  getEstadoMiembro(m: MiembroGrupo): string {
    if (m.enLinea) return 'En linea';

    if (m.ultimaConexion) {
      const fecha = this.parsearFechaUtc(m.ultimaConexion);
      if (!fecha) return 'Desconectado';

      const diffMs = Date.now() - fecha.getTime();
      if (diffMs < 0) return 'Ult. vez hace unos segundos';

      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMin / 60);
      const diffD = Math.floor(diffH / 24);

      if (diffMin < 1) return 'Ult. vez hace unos segundos';
      if (diffMin < 60) return `Ult. vez hace ${diffMin} min`;
      if (diffH < 24) return `Ult. vez hace ${diffH} h`;
      if (diffD < 7) return `Ult. vez hace ${diffD} d`;

      return `Ult. vez ${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
    }

    return 'Desconectado';
  }

  private parsearFechaUtc(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const s = String(fecha);
    return new Date(/Z$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
  }
}