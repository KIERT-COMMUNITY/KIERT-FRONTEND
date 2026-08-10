// chat.component.ts - Chat completo con solicitudes y contactos
import { Component, OnInit, OnDestroy, signal, input, effect, inject, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { Conversacion, Mensaje, SolicitudContacto } from '../../core/models/chat.model';

type VistaChat = 'conversaciones' | 'solicitudes' | 'mensajes';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  // ✅ ELIMINAR RouterLink (no se usa en el template)
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  usuarioId = input<string>();

  // Estados
  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  chatActivo = signal<Conversacion | null>(null);
  cargando = signal(false);
  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  vistaActual = signal<VistaChat>('conversaciones');
  usuariosDisponibles = signal<any[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);

  // Usuario actual
  usuarioActual = this.authService.usuario;

  // ✅ Computed: cantidad de solicitudes pendientes
  solicitudesPendientes = computed(() => {
    const lista = this.solicitudes();
    return lista.filter(s => s.estado === 'pendiente').length;
  });

  // ✅ Computed: verificar si hay solicitudes pendientes
  tieneSolicitudesPendientes = computed(() => {
    return this.solicitudesPendientes() > 0;
  });

  // ✅ Computed: solicitudes pendientes
  solicitudesPendientesLista = computed(() => {
    return this.solicitudes().filter(s => s.estado === 'pendiente');
  });

  // ✅ Computed: no hay solicitudes ni usuarios disponibles
  noHaySolicitudesNiUsuarios = computed(() => {
    const pendientes = this.solicitudes().filter(s => s.estado === 'pendiente');
    return pendientes.length === 0 && this.usuariosDisponibles().length === 0;
  });

  // Computed: si el chat activo es un contacto
  esContacto = computed(() => {
    const activo = this.chatActivo();
    if (!activo) return false;
    return this.conversaciones().some(c => c.usuarioId === activo.usuarioId);
  });

  formMensaje = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  constructor() {
    effect(() => {
      const id = this.usuarioId();
      if (id) {
        const numId = Number(id);
        if (!isNaN(numId)) {
          this.abrirChat(numId);
        }
      }
    });
  }

  ngOnInit(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
    
    this.chatService.onMensajeRecibido((mensaje) => {
      this.recibirMensaje(mensaje);
    });
  }

  ngOnDestroy(): void {
    this.chatService.desconectarWebSocket();
  }

  // ========== CARGAR DATOS ==========
  cargarConversaciones(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        console.log('Conversaciones cargadas:', data);
        this.conversaciones.set(data);
        this.cargando.set(false);
        
        const usuarioId = this.usuarioActual()?.id;
        if (usuarioId) {
          this.chatService.conectarWebSocket(usuarioId);
        }
      },
      error: (error) => {
        console.error('Error al cargar conversaciones:', error);
        this.errorMsg.set('Error al cargar conversaciones');
        this.cargando.set(false);
      }
    });
  }

  cargarSolicitudes(): void {
    this.chatService.listarSolicitudes().subscribe({
      next: (data) => {
        this.solicitudes.set(data);
      },
      error: (error) => {
        console.error('Error al cargar solicitudes:', error);
      }
    });
  }

  cargarUsuariosDisponibles(): void {
    this.chatService.listarUsuariosDisponibles().subscribe({
      next: (data) => {
        // Filtrar usuarios que ya son contactos o tienen solicitud pendiente
        const contactosIds = this.conversaciones().map(c => c.usuarioId);
        const solicitudesIds = this.solicitudes().map(s => s.usuarioId);
        this.usuariosDisponibles.set(
          data.filter(u => 
            u.id !== this.usuarioActual()?.id && 
            !contactosIds.includes(u.id) &&
            !solicitudesIds.includes(u.id)
          )
        );
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    });
  }

  // ========== NAVEGACIÓN ==========
  cambiarVista(vista: VistaChat): void {
    this.vistaActual.set(vista);
    if (vista === 'solicitudes') {
      this.cargarSolicitudes();
      this.cargarUsuariosDisponibles();
    }
    if (vista === 'conversaciones') {
      this.cargarConversaciones();
    }
  }

  volverALista(): void {
    this.vistaActual.set('conversaciones');
    this.chatActivo.set(null);
    this.router.navigate(['/chat']);
  }

  // ========== ABRIR CHAT ==========
  abrirChat(usuarioId: number): void {
    console.log('Abriendo chat con usuario:', usuarioId);
    this.vistaActual.set('mensajes');
    
    const conversacion = this.conversaciones().find((c) => c.usuarioId === usuarioId) ?? null;
    this.chatActivo.set(conversacion);
    this.marcarComoLeidos(usuarioId);
    this.cargarMensajes(usuarioId);
  }

  // ========== CARGAR MENSAJES ==========
  cargarMensajes(usuarioId: number): void {
    this.mensajes.set([]);
    this.chatService.listarMensajes(usuarioId).subscribe({
      next: (data) => {
        this.mensajes.set(data);
      },
      error: (error) => {
        console.error('Error al cargar mensajes:', error);
        this.errorMsg.set('Error al cargar mensajes');
      }
    });
  }

  // ========== ENVIAR MENSAJE ==========
  enviarMensaje(): void {
    if (this.formMensaje.invalid || !this.chatActivo()) {
      return;
    }

    const receptorId = this.chatActivo()!.usuarioId;
    const contenido = this.formMensaje.getRawValue().contenido!;
    const emisorId = this.usuarioActual()?.id;

    if (!emisorId) {
      this.errorMsg.set('Usuario no autenticado');
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set(null);

    const mensajeTemp: Mensaje = {
      id: Date.now(),
      emisorId: emisorId,
      contenido: contenido,
      fechaEnvio: new Date().toISOString(),
      propio: true
    };
    this.mensajes.update((lista) => [...lista, mensajeTemp]);
    this.formMensaje.reset();

    this.chatService.enviarMensajeHttp(receptorId, contenido).subscribe({
      next: (mensajeReal) => {
        this.mensajes.update((lista) => 
          lista.map(m => m.id === mensajeTemp.id ? mensajeReal : m)
        );
        this.enviando.set(false);
        this.chatService.enviarMensajeWebSocket(emisorId, receptorId, contenido);
      },
      error: (error) => {
        console.error('Error al enviar mensaje:', error);
        this.errorMsg.set('Error al enviar mensaje');
        this.enviando.set(false);
        this.mensajes.update((lista) => 
          lista.filter(m => m.id !== mensajeTemp.id)
        );
      }
    });
  }

  // ========== SOLICITUDES ==========
  enviarSolicitud(usuarioId: number): void {
    this.chatService.enviarSolicitud(usuarioId).subscribe({
      next: () => {
        this.errorMsg.set('Solicitud enviada');
        setTimeout(() => this.errorMsg.set(null), 3000);
        this.cargarUsuariosDisponibles();
        this.cargarSolicitudes();
      },
      error: (error) => {
        console.error('Error al enviar solicitud:', error);
        this.errorMsg.set('Error al enviar solicitud');
      }
    });
  }

  aceptarSolicitud(solicitudId: number): void {
    this.chatService.aceptarSolicitud(solicitudId).subscribe({
      next: () => {
        this.cargarConversaciones();
        this.cargarSolicitudes();
        this.errorMsg.set('Solicitud aceptada');
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
      error: (error) => {
        console.error('Error al aceptar solicitud:', error);
        this.errorMsg.set('Error al aceptar solicitud');
      }
    });
  }

  rechazarSolicitud(solicitudId: number): void {
    this.chatService.rechazarSolicitud(solicitudId).subscribe({
      next: () => {
        this.cargarSolicitudes();
        this.errorMsg.set('Solicitud rechazada');
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
      error: (error) => {
        console.error('Error al rechazar solicitud:', error);
        this.errorMsg.set('Error al rechazar solicitud');
      }
    });
  }

  // ========== ELIMINAR CONTACTO ==========
  eliminarContacto(usuarioId: number): void {
    if (!confirm('¿Seguro que quieres eliminar este contacto?')) return;
    
    this.chatService.eliminarContacto(usuarioId).subscribe({
      next: () => {
        this.cargarConversaciones();
        this.cargarUsuariosDisponibles();
        this.chatActivo.set(null);
        this.vistaActual.set('conversaciones');
        this.router.navigate(['/chat']);
        this.errorMsg.set('Contacto eliminado');
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
      error: (error) => {
        console.error('Error al eliminar contacto:', error);
        this.errorMsg.set('Error al eliminar contacto');
      }
    });
  }

  // ========== RECIBIR MENSAJE ==========
  private recibirMensaje(mensaje: Mensaje): void {
    console.log('Mensaje en tiempo real:', mensaje);
    
    const usuarioActualId = this.usuarioActual()?.id;
    const chatActivoId = this.chatActivo()?.usuarioId;

    if (chatActivoId && mensaje.emisorId === chatActivoId) {
      const existe = this.mensajes().some(m => m.id === mensaje.id);
      if (!existe) {
        this.mensajes.update((lista) => [...lista, mensaje]);
      }
    }
    this.actualizarConversacion(mensaje);
  }

  // ========== ACTUALIZAR CONVERSACIÓN ==========
  private actualizarConversacion(mensaje: Mensaje): void {
    const usuarioActualId = this.usuarioActual()?.id;
    if (!usuarioActualId) return;

    const interlocutorId = mensaje.emisorId === usuarioActualId ? 
      this.chatActivo()?.usuarioId : mensaje.emisorId;

    if (!interlocutorId) return;

    this.conversaciones.update((lista) => {
      const index = lista.findIndex(c => c.usuarioId === interlocutorId);
      if (index !== -1) {
        const updated = [...lista];
        updated[index] = {
          ...updated[index],
          ultimoMensaje: mensaje.contenido,
          noLeidos: mensaje.emisorId !== usuarioActualId ? 
            updated[index].noLeidos + 1 : updated[index].noLeidos
        };
        return updated;
      }
      return lista;
    });
  }

  // ========== MARCAR COMO LEÍDOS ==========
  marcarComoLeidos(usuarioId: number): void {
    this.conversaciones.update((lista) => 
      lista.map(c => 
        c.usuarioId === usuarioId ? { ...c, noLeidos: 0 } : c
      )
    );
  }

  // ========== RECARGAR ==========
  recargar(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  // ========== IR AL PERFIL ==========
  irAlPerfil(usuarioId: number): void {
    this.router.navigate(['/perfil', usuarioId]);
  }

  // ========== OBTENER INICIAL ==========
  getInicialUsuario(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }
}