// chat.component.ts -> pantalla de chat entre usuarios (VERSIÓN REAL)
import { Component, OnInit, OnDestroy, signal, input, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { Conversacion, Mensaje } from '../../core/models/chat.model';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  usuarioId = input<string>();

  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  chatActivo = signal<Conversacion | null>(null);
  cargando = signal(false);
  enviando = signal(false);
  errorMsg = signal<string | null>(null);

  // Usuario actual
  usuarioActual = this.authService.usuario;

  formMensaje = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  constructor() {
    // effect(): navegación entre chats
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
    
    // ✅ Escuchar mensajes en tiempo real
    this.chatService.onMensajeRecibido((mensaje) => {
      this.recibirMensaje(mensaje);
    });
  }

  ngOnDestroy(): void {
    this.chatService.desconectarWebSocket();
  }

  // ========== CARGAR CONVERSACIONES ==========
  cargarConversaciones(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.chatService.listarConversaciones().subscribe({
      next: (data) => {
        console.log('📥 Conversaciones cargadas:', data);
        this.conversaciones.set(data);
        this.cargando.set(false);
        
        // ✅ Conectar WebSocket
        const usuarioId = this.usuarioActual()?.id;
        if (usuarioId) {
          this.chatService.conectarWebSocket(usuarioId);
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar conversaciones:', error);
        this.errorMsg.set('Error al cargar conversaciones');
        this.cargando.set(false);
      }
    });
  }

  // ========== ABRIR CHAT ==========
  abrirChat(usuarioId: number): void {
    console.log('📂 Abriendo chat con usuario:', usuarioId);
    
    const conversacion = this.conversaciones().find((c) => c.usuarioId === usuarioId) ?? null;
    this.chatActivo.set(conversacion);
    
    // Marcar mensajes como leídos
    this.marcarComoLeidos(usuarioId);
    
    this.cargarMensajes(usuarioId);
  }

  // ========== CARGAR MENSAJES ==========
  cargarMensajes(usuarioId: number): void {
    this.mensajes.set([]);

    this.chatService.listarMensajes(usuarioId).subscribe({
      next: (data) => {
        console.log('📥 Mensajes cargados:', data);
        this.mensajes.set(data);
      },
      error: (error) => {
        console.error('❌ Error al cargar mensajes:', error);
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

    // ✅ Optimistic UI: mostrar mensaje inmediatamente
    const mensajeTemp: Mensaje = {
      id: Date.now(),
      emisorId: emisorId,
      contenido: contenido,
      fechaEnvio: new Date().toISOString(),
      propio: true
    };
    this.mensajes.update((lista) => [...lista, mensajeTemp]);
    this.formMensaje.reset();

    // ✅ Enviar por HTTP
    this.chatService.enviarMensajeHttp(receptorId, contenido).subscribe({
      next: (mensajeReal) => {
        console.log('✅ Mensaje enviado:', mensajeReal);
        // Reemplazar mensaje temporal con el real
        this.mensajes.update((lista) => 
          lista.map(m => m.id === mensajeTemp.id ? mensajeReal : m)
        );
        this.enviando.set(false);
        
        // ✅ Enviar por WebSocket para tiempo real
        this.chatService.enviarMensajeWebSocket(emisorId, receptorId, contenido);
      },
      error: (error) => {
        console.error('❌ Error al enviar mensaje:', error);
        this.errorMsg.set('Error al enviar mensaje');
        this.enviando.set(false);
        // Quitar mensaje temporal si falló
        this.mensajes.update((lista) => 
          lista.filter(m => m.id !== mensajeTemp.id)
        );
      }
    });
  }

  // ========== RECIBIR MENSAJE EN TIEMPO REAL ==========
  private recibirMensaje(mensaje: Mensaje): void {
    console.log('📩 Mensaje en tiempo real:', mensaje);
    
    const usuarioActualId = this.usuarioActual()?.id;
    const chatActivoId = this.chatActivo()?.usuarioId;

    // Si el mensaje es de la conversación actual, agregarlo
    if (chatActivoId && mensaje.emisorId === chatActivoId) {
      const existe = this.mensajes().some(m => m.id === mensaje.id);
      if (!existe) {
        this.mensajes.update((lista) => [...lista, mensaje]);
      }
    }
    
    // Actualizar la lista de conversaciones
    this.actualizarConversacion(mensaje);
  }

  // ========== ACTUALIZAR CONVERSACIÓN ==========
  private actualizarConversacion(mensaje: Mensaje): void {
    const usuarioActualId = this.usuarioActual()?.id;
    if (!usuarioActualId) return;

    // Determinar el interlocutor
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
    // Implementar cuando el backend soporte marcar como leídos
    console.log('📖 Marcando mensajes como leídos para usuario:', usuarioId);
    
    // Actualizar UI
    this.conversaciones.update((lista) => 
      lista.map(c => 
        c.usuarioId === usuarioId ? { ...c, noLeidos: 0 } : c
      )
    );
  }

  // ========== RECARGAR CONVERSACIONES ==========
  recargar(): void {
    this.cargarConversaciones();
  }
}