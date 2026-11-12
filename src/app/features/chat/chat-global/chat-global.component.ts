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
import { PullToRefreshDirective } from '../../../shared/directives/pull-to-refresh.directive';

@Component({
  selector: 'kiert-chat-global',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AvisoLoginComponent,
    AvatarFrameComponent,
    PullToRefreshDirective
  ],
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
  @ViewChild(PullToRefreshDirective) pullToRefresh!: PullToRefreshDirective;

  isRefreshing = signal(false);
  pullDistance = signal(0);
  pullOpacity = signal(0);

  readonly mensajes = signal<MensajeGlobal[]>([]);
  readonly conectado = signal(false);
  readonly mostrarAvisoLogin = signal(false);

  /** Mensaje al que se está respondiendo (para mostrar la barra de cita) */
  readonly respondiendoA = signal<MensajeGlobal | null>(null);

  texto = '';

  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  /** Controla el swipe de un mensaje concreto: id del mensaje y delta X actual */
  readonly swipeState = signal<{ id: number; deltaX: number } | null>(null);
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swipeActivo = false;

  get estaLogueado(): boolean { return this.authService.estaLogueado(); }

  ngOnInit(): void {
    this.cargarHistorial();

    this.chatService.mensajes$
      .pipe(takeUntil(this.destroy$))
      .subscribe(m => {
        this.ngZone.run(() => {
          this.mensajes.update(lista => [...lista, m]);
          this.scrollAbajo();
          this.cdr.detectChanges();
        });
      });

    this.chatService.conectado$
      .pipe(takeUntil(this.destroy$))
      .subscribe(estado => {
        this.ngZone.run(() => this.conectado.set(estado));
      });

    this.chatService.conectar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
  }

  // ===== RECARGA =====
  recargarMensajes(): void {
    this.isRefreshing.set(true);
    this.pullDistance.set(this.pullToRefresh.pullDistance());
    this.pullOpacity.set(this.pullToRefresh.pullOpacity());

    const timeoutId = setTimeout(() => {
      this.timeouts.delete(timeoutId);
      this.cargarHistorial();
    }, 1000);

    this.timeouts.add(timeoutId);
  }

  private cargarHistorial(): void {
    this.chatService.obtenerHistorial(0, 50)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: historial => {
          this.mensajes.set([...historial].reverse());
          this.scrollAbajo();
          this.finishRefresh();
        },
        error: err => {
          console.error('[CHAT-GLOBAL] Error historial', err);
          this.finishRefresh();
        }
      });
  }

  private finishRefresh(): void {
    this.isRefreshing.set(false);
    if (this.pullToRefresh) this.pullToRefresh.finishRefresh();
    this.pullDistance.set(0);
    this.pullOpacity.set(0);
  }

  // ===== ENVIAR =====
  enviar(): void {
    if (!this.estaLogueado) { this.mostrarAvisoLogin.set(true); return; }
    const contenido = this.texto.trim();
    if (!contenido) return;
    if (contenido.length > 500) return;

    const cita = this.respondiendoA();
    this.chatService.enviarMensaje(contenido, cita?.id);
    this.texto = '';
    this.respondiendoA.set(null);
  }

  // ===== RESPONDER =====
  responderA(m: MensajeGlobal, event?: Event): void {
    event?.stopPropagation();
    if (!this.estaLogueado) { this.mostrarAvisoLogin.set(true); return; }
    this.respondiendoA.set(m);
    this.focusInput();
  }

  cancelarRespuesta(): void {
    this.respondiendoA.set(null);
  }

  /** Devuelve el MensajeGlobal referenciado por una respuesta (si existe en la lista cargada) */
  getMensajeCitado(m: MensajeGlobal): MensajeGlobal | null {
    if (!m.respuestaAId) return null;
    return this.mensajes().find(x => x.id === m.respuestaAId) || null;
  }

  // ===== SWIPE (móvil) =====
  onTouchStart(m: MensajeGlobal, event: TouchEvent): void {
    if (!this.estaLogueado) return;
    const touch = event.touches[0];
    this.swipeStartX = touch.clientX;
    this.swipeStartY = touch.clientY;
    this.swipeActivo = false;
  }

  onTouchMove(m: MensajeGlobal, event: TouchEvent): void {
    if (!this.estaLogueado) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.swipeStartX;
    const deltaY = Math.abs(touch.clientY - this.swipeStartY);

    // Solo activar swipe si el movimiento es claramente horizontal
    if (!this.swipeActivo && Math.abs(deltaX) > 12 && Math.abs(deltaX) > deltaY) {
      this.swipeActivo = true;
    }

    if (!this.swipeActivo) return;

    // Solo permitimos deslizar a la derecha, con tope de 80px
    const limitado = Math.max(0, Math.min(80, deltaX));
    this.swipeState.set({ id: m.id!, deltaX: limitado });
  }

  onTouchEnd(m: MensajeGlobal): void {
    const state = this.swipeState();
    if (!this.swipeActivo || !state || state.id !== m.id) {
      this.swipeState.set(null);
      this.swipeActivo = false;
      return;
    }

    if (state.deltaX >= 60) {
      this.responderA(m);
    }

    this.swipeState.set(null);
    this.swipeActivo = false;
  }

  getSwipeDelta(id: number): number {
    const s = this.swipeState();
    return s && s.id === id ? s.deltaX : 0;
  }

  // ===== FOCUS =====
  private inputRef?: ElementRef<HTMLInputElement>;

  @ViewChild('inputMensaje') set _inputRef(ref: ElementRef<HTMLInputElement> | undefined) {
    if (ref) this.inputRef = ref;
  }

  private focusInput(): void {
    const id = setTimeout(() => {
      this.timeouts.delete(id);
      this.inputRef?.nativeElement.focus();
    }, 50);
    this.timeouts.add(id);
  }

  // ===== AUX =====
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