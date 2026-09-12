import {
  Component,
  OnInit,
  signal,
  inject,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { GrupoService, Grupo, MensajeGrupo } from '../../core/services/grupo.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { Conversacion, Mensaje, SolicitudContacto, MensajeArchivo } from '../../core/models/chat.model';
import { AvatarFrameComponent } from '../../shared/components/avatar-frame/avatar-frame.component';
import { CrearGrupoModalComponent } from '../../shared/components/crear-grupo-modal/crear-grupo-modal.component';

type TabTipo = 'chats' | 'grupos';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AvatarFrameComponent,
    CrearGrupoModalComponent
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private grupoService = inject(GrupoService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  public personalizacionStore = inject(PersonalizacionStore);

  @ViewChild('mensajesContainer') private mensajesContainer?: ElementRef;
  @ViewChild('mensajesGrupoContainer') private mensajesGrupoContainer?: ElementRef;

  // ===== TABS =====
  tabActual = signal<TabTipo>('chats');

  // ===== CONVERSACIONES =====
  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);
  cargando = signal(false);

  // ===== GRUPOS =====
  grupos = signal<Grupo[]>([]);
  grupoSeleccionado = signal<number | null>(null);
  mensajesGrupo = signal<MensajeGrupo[]>([]);
  cargandoGrupo = signal(false);
  enviandoGrupo = signal(false);

  // ===== ESTADO UI =====
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  enviando = signal(false);
  archivosSeleccionados = signal<File[]>([]);
  mobileMenuOpen = signal(false);
  solicitudesExpandidas = signal(false);
  mostrarModalGrupo = signal(false);

  // ===== FORMS =====
  formMensaje = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  formMensajeGrupo = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  // ===== GETTERS =====
  get cantidadSolicitudesPendientes(): number {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE').length;
  }

  get solicitudesPendientes(): SolicitudContacto[] {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE');
  }

  // ===== AGRUPACIÓN POR FECHA (CHAT PRIVADO) =====
  mensajesAgrupados = computed(() => {
    const grupos: { [key: string]: Mensaje[] } = {};
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

  // ===== AGRUPACIÓN POR FECHA (GRUPO) =====
  mensajesGrupoAgrupados = computed(() => {
    const grupos: { [key: string]: MensajeGrupo[] } = {};
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    this.mensajesGrupo().forEach(msg => {
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

    // Detectar parámetros de ruta (usuarioId o grupoId)
    this.route.params.subscribe(params => {
      const usuarioId = params['usuarioId'];
      const grupoId = params['grupoId'];

      if (usuarioId) {
        this.tabActual.set('chats');
        const id = Number(usuarioId);
        this.usuarioSeleccionado.set(id);
        this.marcarMensajesComoLeidos(id);
        this.cargarMensajes(id);
        this.mobileMenuOpen.set(false);
      }

      if (grupoId) {
        this.tabActual.set('grupos');
        const id = Number(grupoId);
        this.grupoSeleccionado.set(id);
        this.cargarMensajesGrupo(id);
        this.mobileMenuOpen.set(false);
      }
    });

    // Polling cada 10s para conversaciones
    this.pollingInterval = setInterval(() => {
      this.actualizarConversacionesYContadores();
    }, 10000);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
    this.scrollToBottomGrupo();
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    const usuarioId = this.usuarioSeleccionado();
    if (usuarioId) {
      this.chatService.marcarComoLeidos(usuarioId).subscribe({
        next: () => this.chatService.resetearNoLeidos(usuarioId)
      });
    }
  }

  // ============================================================
  // TABS
  // ============================================================
  cambiarTab(tab: TabTipo): void {
    this.tabActual.set(tab);

    // Limpiar selección al cambiar de tab
    if (tab === 'chats') {
      this.grupoSeleccionado.set(null);
      this.mensajesGrupo.set([]);
    } else {
      this.usuarioSeleccionado.set(null);
      this.mensajes.set([]);
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

  cargarMensajes(usuarioId: number): void {
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
    this.chatService.listarSolicitudes().subscribe({
      next: (data) => this.solicitudes.set(data),
      error: () => {}
    });
  }

  marcarMensajesComoLeidos(usuarioId: number): void {
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
    this.grupoService.misGrupos().subscribe({
      next: (grupos) => this.grupos.set(grupos),
      error: () => {}
    });
  }

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

    // Redirigir al chat del grupo después de 500ms
    setTimeout(() => {
      this.tabActual.set('grupos');
      this.grupoSeleccionado.set(grupo.id);
      this.cargarMensajesGrupo(grupo.id);
    }, 500);
  }

  seleccionarGrupo(grupoId: number): void {
    this.grupoSeleccionado.set(grupoId);
    this.usuarioSeleccionado.set(null);
    this.mensajes.set([]);
    this.cargarMensajesGrupo(grupoId);
    this.mobileMenuOpen.set(false);

    // Actualizar URL
    this.router.navigate(['/chat/grupo', grupoId]);
  }

  cerrarGrupo(): void {
    this.grupoSeleccionado.set(null);
    this.mensajesGrupo.set([]);
    this.router.navigate(['/chat']);
  }

  cargarMensajesGrupo(grupoId: number): void {
    this.cargandoGrupo.set(true);
    this.grupoService.obtenerMensajes(grupoId).subscribe({
      next: (msgs) => {
        this.mensajesGrupo.set(msgs);
        this.cargandoGrupo.set(false);
        setTimeout(() => this.scrollToBottomGrupo(), 100);
      },
      error: () => {
        this.cargandoGrupo.set(false);
      }
    });
  }

  enviarMensajeGrupo(): void {
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
  // SELECCIÓN DE CONVERSACIÓN
  // ============================================================
  seleccionarConversacion(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
    this.grupoSeleccionado.set(null);
    this.mensajesGrupo.set([]);
    this.marcarMensajesComoLeidos(usuarioId);
    this.cargarMensajes(usuarioId);
    this.mobileMenuOpen.set(false);

    // Actualizar URL
    this.router.navigate(['/chat', usuarioId]);
  }

  cerrarChat(): void {
    this.usuarioSeleccionado.set(null);
    this.mensajes.set([]);
    this.router.navigate(['/chat']);
  }

  // ============================================================
  // MOBILE
  // ============================================================
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(val => !val);
  }

  // ============================================================
  // ENVÍO DE MENSAJES PRIVADOS
  // ============================================================
  enviarMensaje(): void {
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
        error: () => {
          this.errorMsg.set('Error al enviar mensaje');
          this.enviando.set(false);
          setTimeout(() => this.errorMsg.set(null), 3000);
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
        error: () => {
          this.errorMsg.set('Error al enviar mensaje');
          this.enviando.set(false);
          setTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
    }
  }

  // ============================================================
  // ARCHIVOS
  // ============================================================
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

  getNombreUsuario(usuarioId: number): string {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.nombreUsuario || 'Usuario';
  }

  getFotoUsuario(usuarioId: number): string | null {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.fotoPerfilUrl || null;
  }
}