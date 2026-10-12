// src/app/features/community/notificaciones/notificaciones.component.ts
import {
  Component, signal, inject, HostListener,
  OnInit, OnDestroy, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notificacion } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { GrupoService } from '../../../core/services/grupo.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'kiert-notificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.scss'
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private grupoService = inject(GrupoService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  notificaciones = signal<Notificacion[]>([]);
  noLeidas = signal<number>(0);
  mostrando = signal<boolean>(false);
  cargando = signal<boolean>(false);
  invitacionProcesandoId = signal<number | null>(null);
  invitacionPendienteRechazo = signal<Notificacion | null>(null);
  mensajeFlotante = signal<{
    tipo: 'exito' | 'error' | 'rechazo';
    titulo: string;
    descripcion: string;
  } | null>(null);

  private subscription: Subscription | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private mensajeTimerId: ReturnType<typeof setTimeout> | null = null;
  private navegacionTimerId: ReturnType<typeof setTimeout> | null = null;
  private frameConfirmacionId: number | null = null;
  private frameMensajeId: number | null = null;

  get notificacionesRecientes(): Notificacion[] {
    return this.notificaciones().slice(0, 5);
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.cargarNotificaciones();
      this.actualizarContadorNoLeidas();

      this.subscription = this.notificationService.notificaciones$.subscribe({
        next: (notificacion: Notificacion) => {
          if (!notificacion) return;

          if (notificacion.tipo === 'INVITACION_GRUPO' && notificacion.grupoId) {
            const existente = this.notificaciones().find(
              n => n.tipo === 'INVITACION_GRUPO'
                && n.grupoId === notificacion.grupoId
                && !n.leida
            );

            if (existente) {
              this.notificaciones.update(lista =>
                lista.map(n => n.id === existente.id ? notificacion : n)
              );
              this.actualizarContadorNoLeidas();
              return;
            }
          }

          this.notificaciones.update(lista => [notificacion, ...lista]);
          this.noLeidas.update(val => val + 1);
        },
        error: (err) => console.error('Error al recibir notificación:', err)
      });

      this.intervalId = setInterval(() => {
        this.cargarNotificaciones();
        this.actualizarContadorNoLeidas();
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.mensajeTimerId !== null) {
      clearTimeout(this.mensajeTimerId);
      this.mensajeTimerId = null;
    }
    if (this.navegacionTimerId !== null) {
      clearTimeout(this.navegacionTimerId);
      this.navegacionTimerId = null;
    }
    if (this.frameConfirmacionId !== null) {
      cancelAnimationFrame(this.frameConfirmacionId);
      this.frameConfirmacionId = null;
    }
    if (this.frameMensajeId !== null) {
      cancelAnimationFrame(this.frameMensajeId);
      this.frameMensajeId = null;
    }
    document.body.querySelector('.confirmacion-overlay')?.remove();
    document.body.querySelector('.mensaje-flotante')?.remove();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.invitacionPendienteRechazo()) {
      this.cancelarRechazo();
      return;
    }
    if (this.mostrando()) this.cerrarMenu();
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (!this.mostrando()) return;
    const target = event.target as HTMLElement;
    const clickedInside = this.elementRef.nativeElement.contains(target);
    if (!clickedInside) this.cerrarMenu();
  }

  actualizarContadorNoLeidas(): void {
    this.notificationService.contarNoLeidas().subscribe({
      next: (count) => {
        this.noLeidas.set(count);
        this.notificationService.actualizarContador(count);
      },
      error: (err) => console.error('Error al contar no leídas:', err)
    });
  }

  cargarNotificaciones(): void {
    if (this.cargando()) return;
    this.cargando.set(true);

    this.notificationService.obtenerNotificaciones().subscribe({
      next: (data: Notificacion[]) => {
        this.notificaciones.set(data || []);
        this.noLeidas.set((data || []).filter(n => !n.leida).length);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar notificaciones:', err);
        this.cargando.set(false);
      }
    });
  }

  toggleMenu(): void {
    this.mostrando.update(val => !val);
    if (this.mostrando()) {
      this.cargarNotificaciones();
      this.actualizarContadorNoLeidas();
    }
  }

  cerrarMenu(): void {
    this.mostrando.set(false);
  }

  marcarComoLeida(id: number): void {
    this.notificationService.marcarComoLeida(id).subscribe({
      next: () => {
        this.notificaciones.update(lista =>
          lista.map(n => n.id === id ? { ...n, leida: true } : n)
        );
        this.actualizarContadorNoLeidas();
      },
      error: (err) => console.error('Error al marcar como leída:', err)
    });
  }

  marcarTodasComoLeidas(): void {
    const ids = this.notificaciones().filter(n => !n.leida).map(n => n.id);
    if (ids.length === 0) return;

    this.notificationService.marcarTodasComoLeidas(ids).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.map(n => ({ ...n, leida: true })));
        this.noLeidas.set(0);
        this.actualizarContadorNoLeidas();
      },
      error: (err) => console.error('Error al marcar todas como leídas:', err)
    });
  }

  eliminarNotificacion(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.eliminarNotificacion(id).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.filter(n => n.id !== id));
        this.actualizarContadorNoLeidas();
      },
      error: (err) => console.error('Error al eliminar notificación:', err)
    });
  }

  onClickNotificacion(notificacion: Notificacion): void {
    if (this.esInvitacionGrupo(notificacion.tipo)) return;

    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.id);
    }
    if (notificacion.url) {
      this.router.navigate([notificacion.url]);
    }
    this.cerrarMenu();
  }

  verTodas(): void {
    this.cerrarMenu();
    this.router.navigate(['/notificaciones']);
  }

  // ============================================================
  // INVITACIONES A GRUPOS
  // ============================================================
  esInvitacionGrupo(tipo: string): boolean {
    return tipo === 'INVITACION_GRUPO';
  }

  /**
   * ✅ Aceptar invitación — con setTimeout para evitar race condition
   *    (el backend necesita un momento para commitear el estado ACTIVO).
   */
  aceptarInvitacionGrupo(notificacion: Notificacion, event: Event): void {
    event.stopPropagation();

    if (!notificacion.grupoId || this.invitacionProcesandoId() !== null) return;

    this.invitacionProcesandoId.set(notificacion.id);

    this.grupoService.aceptarInvitacion(notificacion.grupoId).subscribe({
      next: () => {
        this.notificaciones.update(lista =>
          lista.filter(n => n.id !== notificacion.id)
        );

        this.notificationService.marcarComoLeida(notificacion.id).subscribe({
          next: () => this.actualizarContadorNoLeidas(),
          error: () => this.actualizarContadorNoLeidas()
        });

        this.invitacionProcesandoId.set(null);
        this.mostrarMensajeFlotante(
          'exito',
          'Invitación aceptada',
          'Te uniste correctamente al grupo.'
        );

        this.navegacionTimerId = setTimeout(() => {
          this.cerrarMenu();
          this.router.navigate(['/chat/grupo', notificacion.grupoId]);
          this.navegacionTimerId = null;
        }, 1500);
      },
      error: (err) => {
        console.error('Error al aceptar invitación:', err);
        this.invitacionProcesandoId.set(null);
        this.mostrarMensajeFlotante(
          'error',
          'No se pudo aceptar la invitación',
          'Inténtalo nuevamente.'
        );
        this.cargarNotificaciones();
        this.actualizarContadorNoLeidas();
      }
    });
  }

  rechazarInvitacionGrupo(notificacion: Notificacion, event: Event): void {
    event.stopPropagation();

    if (!notificacion.grupoId || this.invitacionProcesandoId() !== null) return;

    this.invitacionPendienteRechazo.set(notificacion);
    this.moverCapaAlBody('.confirmacion-overlay', 'confirmacion');
  }

  cancelarRechazo(): void {
    if (this.invitacionProcesandoId() !== null) return;
    this.invitacionPendienteRechazo.set(null);
  }

  confirmarRechazo(): void {
    const notificacion = this.invitacionPendienteRechazo();

    if (!notificacion?.grupoId || this.invitacionProcesandoId() !== null) return;

    this.invitacionProcesandoId.set(notificacion.id);

    this.grupoService.rechazarInvitacion(notificacion.grupoId).subscribe({
      next: () => {
        this.notificaciones.update(lista =>
          lista.filter(n => n.id !== notificacion.id)
        );

        this.notificationService.marcarComoLeida(notificacion.id).subscribe({
          next: () => this.actualizarContadorNoLeidas(),
          error: () => this.actualizarContadorNoLeidas()
        });

        this.invitacionProcesandoId.set(null);
        this.invitacionPendienteRechazo.set(null);
        this.mostrarMensajeFlotante(
          'rechazo',
          'Invitación rechazada',
          'La invitación al grupo fue rechazada.'
        );
      },
      error: (err) => {
        console.error('Error al rechazar invitación:', err);
        this.invitacionProcesandoId.set(null);
        this.invitacionPendienteRechazo.set(null);
        this.mostrarMensajeFlotante(
          'error',
          'No se pudo rechazar la invitación',
          'Inténtalo nuevamente.'
        );
        this.cargarNotificaciones();
        this.actualizarContadorNoLeidas();
      }
    });
  }

  cerrarMensajeFlotante(): void {
    if (this.mensajeTimerId !== null) {
      clearTimeout(this.mensajeTimerId);
      this.mensajeTimerId = null;
    }
    this.mensajeFlotante.set(null);
  }

  private mostrarMensajeFlotante(
    tipo: 'exito' | 'error' | 'rechazo',
    titulo: string,
    descripcion: string
  ): void {
    if (this.mensajeTimerId !== null) {
      clearTimeout(this.mensajeTimerId);
    }

    this.mensajeFlotante.set({ tipo, titulo, descripcion });
    this.moverCapaAlBody('.mensaje-flotante', 'mensaje');
    this.mensajeTimerId = setTimeout(() => {
      this.mensajeFlotante.set(null);
      this.mensajeTimerId = null;
    }, 4000);
  }

  private moverCapaAlBody(
    selector: '.confirmacion-overlay' | '.mensaje-flotante',
    tipo: 'confirmacion' | 'mensaje'
  ): void {
    const frameAnterior = tipo === 'confirmacion'
      ? this.frameConfirmacionId
      : this.frameMensajeId;

    if (frameAnterior !== null) {
      cancelAnimationFrame(frameAnterior);
    }

    const frameId = requestAnimationFrame(() => {
      const elemento = this.elementRef.nativeElement.querySelector(selector) as HTMLElement | null;

      if (elemento && elemento.parentElement !== document.body) {
        document.body.appendChild(elemento);
      }

      if (tipo === 'confirmacion') {
        this.frameConfirmacionId = null;
      } else {
        this.frameMensajeId = null;
      }
    });

    if (tipo === 'confirmacion') {
      this.frameConfirmacionId = frameId;
    } else {
      this.frameMensajeId = frameId;
    }
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'like': '#f85149',
      'comentario': '#2dd4bf',
      'respuesta': '#58a6ff',
      'solicitud': '#f9ca24',
      'sistema': '#8b98a5',
      'INVITACION_GRUPO': '#6c5ce7'
    };
    return colores[tipo] || '#8b98a5';
  }

  getEtiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
      'like': 'Me gusta',
      'comentario': 'Comentario',
      'respuesta': 'Respuesta',
      'solicitud': 'Solicitud',
      'sistema': 'Sistema',
      'INVITACION_GRUPO': 'Invitación a grupo'
    };
    return etiquetas[tipo] || 'Notificación';
  }

  formatearFecha(fecha: Date): string {
    const ahora = new Date();
    const diff = ahora.getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos}m`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return new Date(fecha).toLocaleDateString('es-ES');
  }
}