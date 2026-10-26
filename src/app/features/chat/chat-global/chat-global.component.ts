// src/app/features/chat/chat-global/chat-global.component.ts
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatGlobalService, MensajeGlobal } from '../../../core/services/chat-global.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-chat-global',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-global.component.html',
  styleUrl: './chat-global.component.scss'
})
export class ChatGlobalComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatGlobalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  readonly mensajes = signal<MensajeGlobal[]>([]);
  readonly conectado = signal(false);

  texto = '';

  ngOnInit(): void {
    this.chatService.obtenerHistorial(0, 50).subscribe({
      next: (historial) => {
        this.mensajes.set([...historial].reverse());
        this.scrollAbajo();
      },
      error: (err) => console.error('[CHAT-GLOBAL] Error historial', err)
    });

    this.chatService.mensajes$.subscribe((m) => {
      this.mensajes.update((lista) => [...lista, m]);
      this.scrollAbajo();
    });

    this.chatService.conectado$.subscribe((estado) => this.conectado.set(estado));

    this.chatService.conectar();
  }

  ngOnDestroy(): void {
    this.chatService.desconectar();
  }

  enviar(): void {
    const contenido = this.texto.trim();
    if (!contenido) return;
    this.chatService.enviarMensaje(contenido);
    this.texto = '';
  }

  esPropio(m: MensajeGlobal): boolean {
    return m.autorId === this.authService.getUser()?.id;
  }

  /**
   * Navega al perfil del autor del mensaje.
   * Si es el propio usuario, va a /perfil (su perfil personal).
   */
  irAlPerfil(usuarioId: number | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!usuarioId) return;

    const usuarioActual = this.authService.getUser();
    if (usuarioActual && usuarioActual.id === usuarioId) {
      this.router.navigate(['/perfil']);
      return;
    }
    this.router.navigate(['/usuario', usuarioId]);
  }

  private scrollAbajo(): void {
    setTimeout(() => {
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
  }
}