import { Component, OnInit, signal, inject, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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

  ngOnInit(): void {
    this.cargarDatos();
    this.route.params.subscribe(params => {
      const usuarioId = params['usuarioId'];
      if (usuarioId) {
        this.usuarioSeleccionado.set(Number(usuarioId));
        this.cargarMensajes(Number(usuarioId));
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {}

  scrollToBottom(): void {
    try {
      if (this.mensajesContainer) {
        this.mensajesContainer.nativeElement.scrollTop = 
          this.mensajesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  cargarDatos(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  cargarConversaciones(): void {
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

  get solicitudesPendientes(): SolicitudContacto[] {
    return this.solicitudes().filter(s => s.estado === 'PENDIENTE');
  }

  get cantidadSolicitudesPendientes(): number {
    return this.solicitudesPendientes.length;
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

  seleccionarConversacion(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
    this.router.navigate(['/chat', usuarioId]);
    this.cargarMensajes(usuarioId);
  }

  esImagen(archivo: MensajeArchivo): boolean {
    if (archivo.tipo === 'imagen') return true;
    const extensiones = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const nombre = archivo.nombre.toLowerCase();
    return extensiones.some(ext => nombre.endsWith(ext));
  }

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

  irAlPerfil(usuarioId: number): void {
    this.router.navigate(['/usuario', usuarioId]);
  }

  getNombreUsuario(usuarioId: number): string {
    const conv = this.conversaciones().find(c => c.usuarioId === usuarioId);
    return conv?.nombreUsuario || 'Usuario';
  }

  abrirArchivo(url: string): void {
    window.open(url, '_blank');
  }
}