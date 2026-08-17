// src/app/features/chat/chat.component.ts
import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { Conversacion, Mensaje, SolicitudContacto } from '../../core/models/chat.model';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  solicitudes = signal<SolicitudContacto[]>([]);
  usuarioSeleccionado = signal<number | null>(null);
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  enviando = signal(false);

  formMensaje = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
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

  ngOnDestroy(): void {
    // No hay WebSocket que desconectar
  }

  cargarDatos(): void {
    this.cargarConversaciones();
    this.cargarSolicitudes();
  }

  cargarConversaciones(): void {
    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        this.conversaciones.set(data);
      },
      error: (error) => {
        console.error('Error al cargar conversaciones:', error);
      }
    });
  }

  cargarMensajes(usuarioId: number): void {
    this.cargando.set(true);
    this.chatService.listarMensajes(usuarioId).subscribe({
      next: (data) => {
        this.mensajes.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar mensajes:', error);
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
        // ✅ Recargar todos los datos para mostrar la nueva conversación
        this.cargarDatos();
        // ✅ Si hay un usuario seleccionado, recargar sus mensajes
        const usuarioId = this.usuarioSeleccionado();
        if (usuarioId) {
          this.cargarMensajes(usuarioId);
        }
      },
      error: (error) => {
        this.errorMsg.set(error.error?.mensaje || 'Error al aceptar solicitud');
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
      error: (error) => {
        this.errorMsg.set(error.error?.mensaje || 'Error al rechazar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  seleccionarConversacion(usuarioId: number): void {
    this.usuarioSeleccionado.set(usuarioId);
    this.router.navigate(['/chat', usuarioId]);
    this.cargarMensajes(usuarioId);
  }

  enviarMensaje(): void {
    if (this.formMensaje.invalid) {
      this.formMensaje.markAllAsTouched();
      return;
    }

    const receptorId = this.usuarioSeleccionado();
    if (!receptorId) {
      this.errorMsg.set('Selecciona un usuario para chatear');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    const contenido = this.formMensaje.getRawValue().contenido!;
    this.enviando.set(true);

    this.chatService.enviarMensaje(receptorId, contenido).subscribe({
      next: (nuevoMensaje) => {
        this.mensajes.update(lista => [...lista, nuevoMensaje]);
        this.formMensaje.reset();
        this.enviando.set(false);
        this.cargarConversaciones();
      },
      error: (error) => {
        console.error('Error al enviar mensaje:', error);
        this.errorMsg.set('Error al enviar mensaje');
        this.enviando.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  irAlPerfil(usuarioId: number): void {
    this.router.navigate(['/usuario', usuarioId]);
  }
}