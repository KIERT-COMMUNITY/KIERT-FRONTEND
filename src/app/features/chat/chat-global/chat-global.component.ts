// src/app/features/chat/chat-global/chat-global.component.ts
import {
  Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal, NgZone, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { ChatGlobalService, MensajeGlobal } from '../../../core/services/chat-global.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import { AvatarFrameComponent } from '../../../shared/components/avatar-frame/avatar-frame.component';
import { safeUrl } from '../../../shared/utils/url-sanitizer';

@Component({
  selector: 'kiert-chat-global',
  standalone: true,
  imports: [CommonModule, FormsModule, AvisoLoginComponent, AvatarFrameComponent],
  templateUrl: './chat-global.component.html',
  styleUrl: './chat-global.component.scss'
})
export class ChatGlobalComponent implements OnInit, OnDestroy {
  private readonly chatService = inject(ChatGlobalService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollContainer') scrollContainer?: ElementRef<HTMLDivElement>;

  readonly mensajes = signal<MensajeGlobal[]>([]);
  readonly conectado = signal(false);
  readonly mostrarAvisoLogin = signal(false);

  texto = '';

  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  get estaLogueado(): boolean { return this.authService.estaLogueado(); }

  ngOnInit(): void {
    // 1. Cargar historial
    this.chatService.obtenerHistorial(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: historial => {
          this.mensajes.set([...historial].reverse());
          this.scrollAbajo();
        },
        error: err => console.error('[CHAT-GLOBAL] Error historial', err)
      });

    // 2. Escuchar mensajes en tiempo real
    // IMPORTANTE: el callback viene del WebSocket, FUERA de la NgZone.
    // Hay que envolverlo en ngZone.run() para que Angular detecte cambios.
    this.chatService.mensajes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(m => {
        this.ngZone.run(() => {
          this.mensajes.update(lista => [...lista, m]);
          this.scrollAbajo();
          this.cdr.detectChanges();
        });
      });

    // 3. Escuchar estado de conexion
    this.chatService.conectado$
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.ngZone.run(() => this.conectado.set(estado));
      });

    // 4. Conectar al STOMP
    this.chatService.conectar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
    // NO llamar a this.chatService.desconectar() aqui:
    // el servicio es singleton y debe mantenerse mientras la app viva.
  }

  enviar(): void {
    if (!this.estaLogueado) { this.mostrarAvisoLogin.set(true); return; }
    const contenido = this.texto.trim();
    if (!contenido) return;
    if (contenido.length > 500) return;

    this.chatService.enviarMensaje(contenido);
    this.texto = '';
  }

  onFocusInput(): void {
    if (!this.estaLogueado) this.mostrarAvisoLogin.set(true);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
  }

  cerrarAviso(): void { this.mostrarAvisoLogin.set(false); }

  esPropio(m: MensajeGlobal): boolean {
    return m.autorId === this.authService.getUser()?.id;
  }

  irAlPerfil(usuarioId: number | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!usuarioId) return;
    const actual = this.authService.getUser();
    if (actual && actual.id === usuarioId) {
      this.router.navigate(['/perfil']);
      return;
    }
    this.router.navigate(['/usuario', usuarioId]);
  }

  getMarco(m: MensajeGlobal): string {
    return (m.marcoId || 'none').toString().trim().toLowerCase() || 'none';
  }

  getFoto(m: MensajeGlobal): string | null {
    return safeUrl(m.autorFotoPerfilUrl) ?? 'assets/default-avatar.png';
  }

  getNombre(m: MensajeGlobal): string {
    return m.autorNombreUsuario || 'Usuario';
  }

  private scrollAbajo(): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      const el = this.scrollContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
    this.timeouts.add(id);
  }
}