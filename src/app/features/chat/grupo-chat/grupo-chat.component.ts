import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { GrupoService, Grupo, MensajeGrupo, MiembroGrupo } from '../../../core/services/grupo.service';
import { ChatService } from '../../../core/services/chat.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { Conversacion, SolicitudContacto } from '../../../core/models/chat.model';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';
import { CrearGrupoModalComponent } from '../../../shared/components/crear-grupo-modal/crear-grupo-modal.component';

type TabTipo = 'chats' | 'grupos';

@Component({
  selector: 'kiert-grupo-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AvatarFrameComponent,
    CrearGrupoModalComponent
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

  // ===== TABS =====
  tabActual = signal<TabTipo>('grupos');

  // ===== CONVERSACIONES (para sidebar) =====
  conversaciones = signal<Conversacion[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);

  // ===== GRUPOS =====
  grupos = signal<Grupo[]>([]);
  grupoSeleccionado = signal<number | null>(null);
  grupo = signal<Grupo | null>(null);
  mensajes = signal<MensajeGrupo[]>([]);
  miembros = signal<MiembroGrupo[]>([]);

  // ===== ESTADO UI =====
  cargando = signal(false);
  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  mobileMenuOpen = signal(false);
  solicitudesExpandidas = signal(false);
  mostrarModalGrupo = signal(false);
  mostrarMiembros = signal(false);

  // ===== FORMS =====
  formMensaje = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  // ===== GETTERS =====
  get cantidadSolicitudesPendientes(): number {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE').length;
  }

  get solicitudesPendientes(): SolicitudContacto[] {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE');
  }

  // ===== AGRUPACIÓN POR FECHA =====
  mensajesAgrupados = computed(() => {
    const grupos: { [key: string]: MensajeGrupo[] } = {};
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.mensajes().forEach(msg => {
      const fecha = new Date(msg.fechaEnvio);
      let key: string;

      if (fecha.toDateString() === hoy.toDateString()) {
        key = 'Hoy';
      } else if (fecha.toDateString() === ayer.toDateString()) {
        key = 'Ayer';
      } else {
        key = fecha.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }

      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(msg);
    });

    return Object.keys(grupos).map(key => ({
      fecha: key,
      mensajes: grupos[key]
    }));
  });

  private pollingInterval: any;

  constructor() {
    this.chatService.conversaciones$.subscribe(conversaciones => {
      if (conversaciones.length > 0) {
        this.conversaciones.set(conversaciones);
      }
    });
  }

  // ============================================================
  // CICLO DE VIDA
  // ============================================================
  ngOnInit(): void {
    this.cargarDatos();
    this.cargarGrupos();

    this.route.params.subscribe(params => {
      const grupoId = params['id'] || params['grupoId'];
      if (grupoId) {
        const id = Number(grupoId);
        this.tabActual.set('grupos');
        this.grupoSeleccionado.set(id);
        this.cargarGrupo(id);
        this.cargarMensajes(id);
        this.cargarMiembros(id);
        this.mobileMenuOpen.set(false);
      }
    });

    this.pollingInterval = setInterval(() => {
      this.actualizarConversacionesYContadores();
      const gid = this.grupoSeleccionado();
      if (gid) this.cargarMensajes(gid);
    }, 10000);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

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
    this.chatService.listarConversaciones().subscribe({
      next: (data) => this.conversaciones.set(data),
      error: () => {}
    });
  }

  actualizarConversacionesYContadores(): void {
    this.chatService.listarConversaciones().subscribe({
      next: (data) => this.conversaciones.set(data),
      error: () => {}
    });
  }

  cargarSolicitudes(): void {
    this.chatService.listarSolicitudes().subscribe({
      next: (data) => this.solicitudes.set(data),
      error: () => {}
    });
  }

  cargarGrupos(): void {
    this.grupoService.misGrupos().subscribe({
      next: (grupos) => this.grupos.set(grupos),
      error: () => {}
    });
  }

  cargarGrupo(grupoId: number): void {
    this.grupoService.obtenerGrupo(grupoId).subscribe({
      next: (g) => this.grupo.set(g),
      error: () => this.errorMsg.set('Error al cargar el grupo')
    });
  }

  cargarMensajes(grupoId: number): void {
    this.cargando.set(true);
    this.grupoService.obtenerMensajes(grupoId).subscribe({
      next: (msgs) => {
        this.mensajes.set(msgs);
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

  cargarMiembros(grupoId: number): void {
    this.grupoService.listarMiembros(grupoId).subscribe({
      next: (miembros) => this.miembros.set(miembros),
      error: () => {}
    });
  }

  // ============================================================
  // GRUPOS — ACCIONES
  // ============================================================
  abrirModalGrupo(): void {
    this.mostrarModalGrupo.set(true);
  }

  cerrarModalGrupo(): void {
    this.mostrarModalGrupo.set(false);
  }

  onGrupoCreado(grupo: Grupo): void {
    this.grupos.update(lista => [grupo, ...lista]);
    this.exitoMsg.set(`Grupo "${grupo.nombre}" creado correctamente`);
    setTimeout(() => this.exitoMsg.set(null), 3000);

    setTimeout(() => {
      this.tabActual.set('grupos');
      this.grupoSeleccionado.set(grupo.id);
      this.cargarGrupo(grupo.id);
      this.cargarMensajes(grupo.id);
      this.cargarMiembros(grupo.id);
    }, 500);
  }

  seleccionarGrupo(grupoId: number): void {
    this.grupoSeleccionado.set(grupoId);
    this.usuarioSeleccionado.set(null);
    this.grupo.set(null);
    this.mensajes.set([]);
    this.miembros.set([]);
    this.cargarGrupo(grupoId);
    this.cargarMensajes(grupoId);
    this.cargarMiembros(grupoId);
    this.mobileMenuOpen.set(false);
    this.router.navigate(['/chat/grupo', grupoId]);
  }

  cerrarGrupo(): void {
    this.grupoSeleccionado.set(null);
    this.grupo.set(null);
    this.mensajes.set([]);
    this.miembros.set([]);
    this.mostrarMiembros.set(false);
    this.router.navigate(['/chat']);
  }

  seleccionarConversacion(usuarioId: number): void {
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
  }

  // ============================================================
  // ENVÍO DE MENSAJES
  // ============================================================
  enviarMensaje(): void {
    const contenido = this.formMensaje.value.contenido?.trim();
    const grupoId = this.grupoSeleccionado();

    if (!contenido || !grupoId) return;

    this.enviando.set(true);

    this.grupoService.enviarMensaje(grupoId, contenido).subscribe({
      next: (msg) => {
        this.mensajes.update(lista => [...lista, msg]);
        this.formMensaje.reset();
        this.enviando.set(false);
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: () => {
        this.errorMsg.set('Error al enviar mensaje');
        this.enviando.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ============================================================
  // SOLICITUDES
  // ============================================================
  toggleSolicitudes(): void {
    this.solicitudesExpandidas.update(val => !val);
  }

  aceptarSolicitud(solicitudId: number): void {
    this.chatService.aceptarSolicitud(solicitudId).subscribe({
      next: () => {
        this.exitoMsg.set('Solicitud aceptada');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('Error al aceptar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  rechazarSolicitud(solicitudId: number): void {
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
    } catch (err) {}
  }

  irAlPerfil(usuarioId: number): void {
    this.router.navigate(['/usuario', usuarioId]);
  }

  getNombreUsuario(usuarioId: number): string {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.nombreUsuario || 'Usuario';
  }

  getFotoUsuario(usuarioId: number): string | null {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.fotoPerfilUrl || null;
  }
}