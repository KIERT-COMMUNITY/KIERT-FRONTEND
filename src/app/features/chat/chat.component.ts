// chat.component.ts

import { 
  Component, 
  OnInit, 
  signal, 
  inject, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  AfterViewChecked 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { Conversacion, Mensaje, SolicitudContacto, MensajeArchivo } from '../../core/models/chat.model';
import { AvatarFrameComponent } from '../../shared/components/avatar-frame/avatar-frame.component';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvatarFrameComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  public personalizacionStore = inject(PersonalizacionStore);

  @ViewChild('mensajesContainer') private mensajesContainer!: ElementRef;

  // Señales
  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  enviando = signal(false);
  archivosSeleccionados = signal<File[]>([]);
  mostrarImagenSensible = signal<{ [key: number]: boolean }>({});

  formMensaje = this.fb.group({
    contenido: ['', [Validators.minLength(1)]]
  });

  // ✅ GETTERS (sin paréntesis en el HTML)
  get cantidadSolicitudesPendientes(): number {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE').length;
  }

  get solicitudesPendientes(): SolicitudContacto[] {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE');
  }

  // Intervalo para polling
  private pollingInterval: any;

  constructor() {
    // Suscribirse a cambios en las conversaciones
    this.chatService.conversaciones$.subscribe(conversaciones => {
      if (conversaciones.length > 0) {
        this.conversaciones.set(conversaciones);
      }
    });
  }

  ngOnInit(): void {
    // Cargar datos iniciales
    this.cargarDatos();

    // Suscribirse a cambios de ruta
    this.route.params.subscribe(params => {
      const usuarioId = params['usuarioId'];
      if (usuarioId) {
        const id = Number(usuarioId);
        this.usuarioSeleccionado.set(id);
        this.marcarMensajesComoLeidos(id);
        this.cargarMensajes(id);
      }
    });

    // Polling cada 10 segundos para actualizar conversaciones y contadores
    this.pollingInterval = setInterval(() => {
      this.actualizarConversacionesYContadores();
    }, 10000);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    // Limpiar intervalos
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Marcar como leídos al salir si hay usuario seleccionado
    const usuarioId = this.usuarioSeleccionado();
    if (usuarioId) {
      this.chatService.marcarComoLeidos(usuarioId).subscribe({
        next: () => {
          this.chatService.resetearNoLeidos(usuarioId);
        }
      });
    }
  }

  // ========== MÉTODOS DE CARGA ==========
  cargarDatos(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  cargarConversaciones(): void {
    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        this.conversaciones.set(data);
      },
      error: () => {
        // Error silencioso
      }
    });
  }

  actualizarConversacionesYContadores(): void {
    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        this.conversaciones.set(data);
      },
      error: () => {
        // Error silencioso
      }
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
      next: (data) => {
        console.log('📋 Solicitudes cargadas:', data);
        this.solicitudes.set(data);
      },
      error: () => {}
    });
  }

  // ========== MANEJO DE CONTADORES ==========
  marcarMensajesComoLeidos(usuarioId: number): void {
    // 1. Actualizar localmente el contador a 0
    this.conversaciones.update(convs => 
      convs.map(conv => 
        conv.usuarioId === usuarioId 
          ? { ...conv, noLeidos: 0 } 
          : conv
      )
    );

    // 2. Actualizar en el servicio
    this.chatService.resetearNoLeidos(usuarioId);

    // 3. Notificar al servidor
    this.chatService.marcarComoLeidos(usuarioId).subscribe({
      next: () => {
        console.log(`✅ Mensajes marcados como leídos para usuario ${usuarioId}`);
      },
      error: (error) => {
        console.error('❌ Error al marcar mensajes como leídos:', error);
        this.cargarConversaciones();
      }
    });
  }

  // ========== SOLICITUDES ==========
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

  // ========== SELECCIÓN DE CONVERSACIÓN ==========
  seleccionarConversacion(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
    this.router.navigate(['/chat', usuarioId]);
    
    // Marcar mensajes como leídos
    this.marcarMensajesComoLeidos(usuarioId);
    
    // Cargar mensajes
    this.cargarMensajes(usuarioId);
  }

  // ========== ENVÍO DE MENSAJES ==========
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

  // ========== ARCHIVOS ==========
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

  // ========== UTILIDADES ==========
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
}