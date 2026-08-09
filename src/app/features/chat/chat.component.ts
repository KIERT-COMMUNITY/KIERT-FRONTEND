// chat.component.ts -> pantalla de chat entre usuarios.
// Panel izquierdo: lista de conversaciones. Panel derecho: mensajes del chat activo.
// En celular, se muestra un panel a la vez (ver .scss) para aprovechar el espacio.
import { Component, OnInit, signal, input, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChatService } from '../../core/services/chat.service';
import { Conversacion, Mensaje } from '../../core/models/chat.model';

@Component({
  selector: 'kiert-chat',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit {
  // usuarioId es opcional: viene de la ruta /chat/:usuarioId cuando ya hay un chat abierto
  usuarioId = input<string>();

  conversaciones = signal<Conversacion[]>([]);
  mensajes = signal<Mensaje[]>([]);
  chatActivo = signal<Conversacion | null>(null);

  formMensaje = this.fb.group({
    contenido: ['', [Validators.required]],
  });

  constructor(private chatService: ChatService, private fb: FormBuilder) {
    // effect(): se ejecuta cada vez que cambia el signal usuarioId (navegación entre chats)
    effect(() => {
      const id = this.usuarioId();
      if (id) this.abrirChat(Number(id));
    });
  }

  ngOnInit(): void {
    this.chatService.listarConversaciones().subscribe((data) => this.conversaciones.set(data));
  }

  abrirChat(usuarioId: number): void {
    const conversacion = this.conversaciones().find((c) => c.usuarioId === usuarioId) ?? null;
    this.chatActivo.set(conversacion);
    this.chatService.listarMensajes(usuarioId).subscribe((data) => this.mensajes.set(data));
  }

  enviarMensaje(): void {
    if (this.formMensaje.invalid || !this.chatActivo()) return;

    const contenido = this.formMensaje.getRawValue().contenido!;
    // Optimistic UI: se agrega el mensaje al instante en pantalla (mejor UX),
    // luego se confirma/reemplaza con la respuesta real del backend.
    this.mensajes.update((lista) => [
      ...lista,
      { id: Date.now(), emisorId: 1, contenido, fechaEnvio: new Date().toISOString(), propio: true },
    ]);
    this.formMensaje.reset();
  }
}
