// src/app/features/community/notificaciones/notificaciones.component.ts
import {
  Component, signal, inject, HostListener,
  OnInit, OnDestroy, ElementRef, Renderer2
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, Notificacion, TipoNotificacion } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { GrupoService } from '../../../core/services/grupo.service';
import { Subscription } from 'rxjs';

type TipoMensaje = 'exito' | 'error' | 'rechazo';

// Clave para guardar en localStorage
const STORAGE_KEY = 'kiert_notificaciones_estados';

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
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);

  notificaciones = signal<Notificacion[]>([]);
  noLeidas = signal<number>(0);
  mostrando = signal<boolean>(false);
  cargando = signal<boolean>(false);
  invitacionProcesandoId = signal<number | null>(null);
  invitacionPendienteRechazo = signal<Notificacion | null>(null);

  mensajeFlotante = signal<{
    tipo: TipoMensaje;
    titulo: string;
    descripcion: string;
  } | null>(null);

  private subscription: Subscription | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private mensajeTimerId: ReturnType<typeof setTimeout> | null = null;
  private navegacionTimerId: ReturnType<typeof setTimeout> | null = null;

  get notificacionesRecientes(): Notificacion[] {
    return this.notificaciones().slice(0, 5);
  }

  get nombreGrupoPendiente(): string {
    const n = this.invitacionPendienteRechazo();
    if (!n) return 'este grupo';
    const nombre = (n as any)['grupoNombre'] ?? (n as any)['titulo'];
    return typeof nombre === 'string' && nombre.trim().length > 0 ? nombre : 'este grupo';
  }

  ngOnInit(): void {
    this.renderer.setStyle(this.document.body, 'overflow', this.invitacionPendienteRechazo() ? 'hidden' : 'auto');

    if (this.authService.isAuthenticated()) {
      this.cargarNotificaciones();
      this.actualizarContadorNoLeidas();

      this.subscription = this.notificationService.notificaciones$.subscribe({
        next: (notificacion: Notificacion) => {
          if (!notificacion) return;
          if (notificacion.tipo === 'INVITACION_GRUPO' && notificacion.grupoId) {
            const existente = this.notificaciones().find(
              n => n.tipo === 'INVITACION_GRUPO' && n.grupoId === notificacion.grupoId && !n.leida
            );
            if (existente) {
              this.notificaciones.update(lista => lista.map(n => n.id === existente.id ? { ...n, ...notificacion } : n));
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
        if (!this.invitacionProcesandoId()) {
          this.cargarNotificaciones();
          this.actualizarContadorNoLeidas();
        }
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    this.renderer.setStyle(this.document.body, 'overflow', 'auto');
    this.subscription?.unsubscribe();
    if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; }
    if (this.mensajeTimerId !== null) { clearTimeout(this.mensajeTimerId); this.mensajeTimerId = null; }
    if (this.navegacionTimerId !== null) { clearTimeout(this.navegacionTimerId); this.navegacionTimerId = null; }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.invitacionPendienteRechazo()) { this.cancelarRechazo(); return; }
    if (this.mostrando()) this.cerrarMenu();
  }

  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent): void {
    if (!this.mostrando()) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target) && !target.closest('.confirmacion-overlay')) {
      this.cerrarMenu();
    }
  }

  actualizarContadorNoLeidas(): void {
    this.notificationService.contarNoLeidas().subscribe({
      next: (count) => { this.noLeidas.set(count); this.notificationService.actualizarContador(count); },
      error: (err) => console.error('Error al contar no leídas:', err)
    });
  }

  cargarNotificaciones(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.notificationService.obtenerNotificaciones().subscribe({
      next: (data: Notificacion[]) => {
        // Recuperamos el estado guardado en localStorage (por si recargaron la página)
        const estadosGuardados: Record<string, 'aceptada' | 'rechazada'> =
          JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

        const dataConEstado = (data || []).map(n => {
          // 1. Si el estado estaba en memoria (antes de recargar)
          const existente = this.notificaciones().find(x => x.id === n.id);
          if (existente && existente.estadoInvitacion) {
            n.estadoInvitacion = existente.estadoInvitacion;
          }
          // 2. Si el estado estaba en el localStorage (después de recargar)
          else if (estadosGuardados[n.id]) {
            n.estadoInvitacion = estadosGuardados[n.id];
            n.leida = true;
            n.mensaje = `<strong>Invitación ${estadosGuardados[n.id]}.</strong> ${
              estadosGuardados[n.id] === 'aceptada'
                ? 'Te has unido al grupo.'
                : 'Ya no formas parte de esta invitación.'
            }`;
          }
          return n;
        });

        this.notificaciones.set(dataConEstado);
        this.noLeidas.set((data || []).filter(n => !n.leida).length);
        this.cargando.set(false);
      },
      error: (err) => { console.error('Error al cargar notificaciones:', err); this.cargando.set(false); }
    });
  }

  toggleMenu(): void {
    this.mostrando.update(val => !val);
    if (this.mostrando()) { this.cargarNotificaciones(); this.actualizarContadorNoLeidas(); }
  }

  cerrarMenu(): void { this.mostrando.set(false); }

  marcarComoLeida(id: number): void {
    this.notificationService.marcarComoLeida(id).subscribe({
      next: () => { this.notificaciones.update(lista => lista.map(n => n.id === id ? { ...n, leida: true } : n)); this.actualizarContadorNoLeidas(); },
      error: (err) => console.error('Error al marcar como leída:', err)
    });
  }

  marcarTodasComoLeidas(): void {
    const ids = this.notificaciones().filter(n => !n.leida).map(n => n.id);
    if (ids.length === 0) return;
    this.notificationService.marcarTodasComoLeidas(ids).subscribe({
      next: () => { this.notificaciones.update(lista => lista.map(n => ({ ...n, leida: true }))); this.noLeidas.set(0); this.actualizarContadorNoLeidas(); },
      error: (err) => console.error('Error al marcar todas como leídas:', err)
    });
  }

  eliminarNotificacion(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.eliminarNotificacion(id).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.filter(n => n.id !== id));
        this.actualizarContadorNoLeidas();

        // Limpiamos el localStorage si se elimina la notificación
        const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete estadosGuardados[id];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
      },
      error: (err) => console.error('Error al eliminar notificación:', err)
    });
  }

  // CORREGIDO: Al dar clic, solo marca como leída pero NO navega
  onClickNotificacion(notificacion: Notificacion): void {
    // Si ya fue procesada o es una invitación, no hacemos nada
    if (notificacion.estadoInvitacion || this.esInvitacionGrupo(notificacion.tipo)) {
      return;
    }

    // Solo marcamos como leída si no lo está
    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.id);
    }

    // Cerrar el menú, pero NO navegar a ninguna ruta
    this.cerrarMenu();
  }

  private construirNavegacion(notificacion: Notificacion): { ruta: any[]; queryParams?: Record<string, any>; } | null {
    const n = notificacion;
    switch (n.tipo) {
      case 'comentario': if (n.postId) return { ruta: ['/comunidad', n.postId], queryParams: n.comentarioId ? { comentarioId: n.comentarioId } : undefined }; break;
      case 'respuesta':
        if (n.postId) {
          const qp: Record<string, any> = {};
          if (n.comentarioId) qp['comentarioId'] = n.comentarioId;
          if (n.respuestaId) qp['respuestaId'] = n.respuestaId;
          return { ruta: ['/comunidad', n.postId], queryParams: Object.keys(qp).length > 0 ? qp : undefined };
        }
        break;
      case 'like': if (n.postId) return { ruta: ['/comunidad', n.postId] }; break;
      case 'solicitud': return { ruta: ['/chat'] };
      case 'sistema': if (n.url) return { ruta: [n.url] }; break;
      case 'REPORTE_NUEVO': return { ruta: ['/admin/reportes'] };
      case 'REPORTE_RESUELTO':
      case 'REPORTE_RECHAZADO': return { ruta: ['/mis-reportes'] };
      case 'ADVERTENCIA':
      case 'CONTENIDO_ELIMINADO':
      case 'USUARIO_BANEADO': return { ruta: ['/mis-publicaciones'] };
    }
    if (n.url) return { ruta: [n.url] };
    return null;
  }

  verTodas(): void { this.cerrarMenu(); this.router.navigate(['/notificaciones']); }

  esInvitacionGrupo(tipo: string): boolean { return tipo === 'INVITACION_GRUPO'; }

  aceptarInvitacionGrupo(notificacion: Notificacion, event: Event): void {
    event.stopPropagation();
    if (!notificacion.grupoId || this.invitacionProcesandoId() !== null || notificacion.estadoInvitacion) return;

    this.invitacionProcesandoId.set(notificacion.id);

    this.grupoService.aceptarInvitacion(notificacion.grupoId).subscribe({
      next: () => {
        this.procesarAceptacionExitosa(notificacion);
      },
      error: (err) => {
        if (err.status === 400 || err.status === 409) {
          this.procesarAceptacionExitosa(notificacion, 'Ya perteneces a este grupo.');
        } else {
          console.error('Error al aceptar invitación:', err);
          this.invitacionProcesandoId.set(null);
          this.mostrarMensajeFlotante('error', 'No se pudo aceptar la solicitud', 'Inténtalo nuevamente.');
        }
      }
    });
  }

  private procesarAceptacionExitosa(notificacion: Notificacion, mensajePersonalizado?: string): void {
    this.notificaciones.update(lista => lista.map(n => {
      if (n.id === notificacion.id) {
        n.estadoInvitacion = 'aceptada';
        n.leida = true;
        n.mensaje = `<strong>Invitación aceptada.</strong> Te has unido al grupo.`;
      }
      return n;
    }));

    // Guardamos el estado en localStorage
    this.guardarEstadoEnStorage(notificacion.id, 'aceptada');

    this.notificationService.marcarComoLeida(notificacion.id).subscribe({
      next: () => this.actualizarContadorNoLeidas(),
      error: () => this.actualizarContadorNoLeidas()
    });

    this.invitacionProcesandoId.set(null);

    const titulo = mensajePersonalizado ? 'Aviso' : 'Solicitud aceptada';
    const descripcion = mensajePersonalizado || 'Te uniste correctamente al grupo.';

    this.mostrarMensajeFlotante('exito', titulo, descripcion);

    this.navegacionTimerId = setTimeout(() => {
      this.cerrarMenu();
      this.router.navigate(['/chat/grupo', notificacion.grupoId]);
      this.navegacionTimerId = null;
    }, 1500);
  }

  rechazarInvitacionGrupo(notificacion: Notificacion, event: Event): void {
    event.stopPropagation();
    if (!notificacion.grupoId || this.invitacionProcesandoId() !== null || notificacion.estadoInvitacion) return;
    this.invitacionPendienteRechazo.set(notificacion);
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
  }

  cancelarRechazo(): void {
    if (this.invitacionProcesandoId() !== null) return;
    this.invitacionPendienteRechazo.set(null);
    this.renderer.setStyle(this.document.body, 'overflow', 'auto');
  }

  confirmarRechazo(): void {
    const notificacion = this.invitacionPendienteRechazo();
    if (!notificacion?.grupoId || this.invitacionProcesandoId() !== null) return;
    this.invitacionProcesandoId.set(notificacion.id);

    this.grupoService.rechazarInvitacion(notificacion.grupoId).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.map(n => {
          if (n.id === notificacion.id) {
            n.estadoInvitacion = 'rechazada';
            n.leida = true;
            n.mensaje = `<strong>Invitación rechazada.</strong> Ya no formas parte de esta invitación.`;
          }
          return n;
        }));

        // Guardamos el estado en localStorage
        this.guardarEstadoEnStorage(notificacion.id, 'rechazada');

        this.notificationService.marcarComoLeida(notificacion.id).subscribe({
          next: () => this.actualizarContadorNoLeidas(),
          error: () => this.actualizarContadorNoLeidas()
        });

        this.invitacionProcesandoId.set(null);
        this.invitacionPendienteRechazo.set(null);
        this.renderer.setStyle(this.document.body, 'overflow', 'auto');

        this.mostrarMensajeFlotante('rechazo', 'Solicitud rechazada', 'La invitación al grupo fue rechazada.');
      },
      error: (err) => {
        console.error('Error al rechazar invitación:', err);
        this.invitacionProcesandoId.set(null);
        this.invitacionPendienteRechazo.set(null);
        this.renderer.setStyle(this.document.body, 'overflow', 'auto');
        this.mostrarMensajeFlotante('error', 'No se pudo rechazar la solicitud', 'Inténtalo nuevamente.');
      }
    });
  }

  // Método auxiliar para guardar en localStorage
  private guardarEstadoEnStorage(id: number, estado: 'aceptada' | 'rechazada'): void {
    try {
      const estadosGuardados = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      estadosGuardados[id] = estado;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estadosGuardados));
    } catch (e) {
      console.error('Error al guardar en localStorage:', e);
    }
  }

  cerrarMensajeFlotante(): void {
    if (this.mensajeTimerId !== null) { clearTimeout(this.mensajeTimerId); this.mensajeTimerId = null; }
    this.mensajeFlotante.set(null);
  }

  private mostrarMensajeFlotante(tipo: TipoMensaje, titulo: string, descripcion: string): void {
    if (this.mensajeTimerId !== null) clearTimeout(this.mensajeTimerId);
    this.mensajeFlotante.set({ tipo, titulo, descripcion });
    this.mensajeTimerId = setTimeout(() => { this.mensajeFlotante.set(null); this.mensajeTimerId = null; }, 4000);
  }

  getColorTipo(tipo: string): string { return this.notificationService.getColorTipo(tipo as TipoNotificacion); }
  getEtiquetaTipo(tipo: string): string { return this.notificationService.getEtiquetaTipo(tipo as TipoNotificacion); }
  esNotificacionDeReporte(tipo: string): boolean { return this.notificationService.esNotificacionDeReporte(tipo as TipoNotificacion); }

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