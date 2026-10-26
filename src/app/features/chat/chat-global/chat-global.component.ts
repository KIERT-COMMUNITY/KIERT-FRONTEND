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
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-chat-global',
  standalone: true,
  imports: [CommonModule, FormsModule, AvisoLoginComponent],
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
  readonly mostrarAvisoLogin = signal(false);

  texto = '';

  /** ✅ Getter usado por el template para decidir si muestra el form o el bloque invitado */
  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

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

  /** ✅ Solo los logueados pueden enviar */
  enviar(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }
    const contenido = this.texto.trim();
    if (!contenido) return;
    this.chatService.enviarMensaje(contenido);
    this.texto = '';
  }

  /** ✅ Al hacer clic en el input "falso" o enfocarlo */
  onFocusInput(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
    }
  }

  /** ✅ Redirige al login guardando la URL actual para volver después */
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAviso(): void {
    this.mostrarAvisoLogin.set(false);
  }

  esPropio(m: MensajeGlobal): boolean {
    return m.autorId === this.authService.getUser()?.id;
  }

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