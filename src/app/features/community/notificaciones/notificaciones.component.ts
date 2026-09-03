// src/app/features/community/notificaciones/notificaciones.component.ts
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService, Notificacion } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'kiert-notificaciones',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notificaciones.component.html',
  styleUrl: './notificaciones.component.scss'
})
export class NotificacionesComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  notificaciones = signal<Notificacion[]>([]);
  noLeidas = signal<number>(0);
  mostrando = signal<boolean>(false);
  cargando = signal<boolean>(false);
  private subscription: Subscription | null = null;
  private intervalId: any = null;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.cargarNotificaciones();
      
      // ✅ Suscribirse a nuevas notificaciones
      this.subscription = this.notificationService.notificaciones$.subscribe({
        next: (notificacion: Notificacion) => {
          if (notificacion) {
            this.notificaciones.update(lista => [notificacion, ...lista]);
            this.noLeidas.update(val => val + 1);
          }
        },
        error: (err: any) => {
          console.error('Error al recibir notificación:', err);
        }
      });

      // ✅ Actualizar cada 30 segundos
      this.intervalId = setInterval(() => {
        this.cargarNotificaciones();
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cargarNotificaciones(): void {
    if (this.cargando()) return;
    this.cargando.set(true);
    
    this.notificationService.obtenerNotificaciones().subscribe({
      next: (data: Notificacion[]) => {
        this.notificaciones.set(data);
        this.noLeidas.set(data.filter(n => !n.leida).length);
        this.cargando.set(false);
      },
      error: (err: any) => {
        console.error('Error al cargar notificaciones:', err);
        this.cargando.set(false);
      }
    });
  }

  toggleMenu(): void {
    this.mostrando.update(val => !val);
    if (this.mostrando()) {
      this.cargarNotificaciones();
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
        this.noLeidas.update(val => Math.max(0, val - 1));
      },
      error: (err: any) => {
        console.error('Error al marcar como leída:', err);
      }
    });
  }

  marcarTodasComoLeidas(): void {
    const ids = this.notificaciones()
      .filter(n => !n.leida)
      .map(n => n.id);
    
    if (ids.length === 0) return;

    this.notificationService.marcarTodasComoLeidas(ids).subscribe({
      next: () => {
        this.notificaciones.update(lista =>
          lista.map(n => ({ ...n, leida: true }))
        );
        this.noLeidas.set(0);
      },
      error: (err: any) => {
        console.error('Error al marcar todas como leídas:', err);
      }
    });
  }

  eliminarNotificacion(id: number): void {
    this.notificationService.eliminarNotificacion(id).subscribe({
      next: () => {
        const noti = this.notificaciones().find(n => n.id === id);
        this.notificaciones.update(lista => lista.filter(n => n.id !== id));
        if (noti && !noti.leida) {
          this.noLeidas.update(val => Math.max(0, val - 1));
        }
      },
      error: (err: any) => {
        console.error('Error al eliminar notificación:', err);
      }
    });
  }

  getIconoTipo(tipo: string): string {
    const iconos: Record<string, string> = {
      'like': '❤️',
      'comentario': '💬',
      'respuesta': '↩️',
      'solicitud': '🤝',
      'sistema': '🔔'
    };
    return iconos[tipo] || '🔔';
  }

  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'like': '#f85149',
      'comentario': '#2dd4bf',
      'respuesta': '#58a6ff',
      'solicitud': '#f9ca24',
      'sistema': '#8b98a5'
    };
    return colores[tipo] || '#8b98a5';
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

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  // ✅ Método para manejar el click en una notificación
  onClickNotificacion(notificacion: Notificacion): void {
    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.id);
    }
    if (notificacion.url) {
      // Navegar a la URL
      import('@angular/router').then(router => {
        const routerInstance = inject(router.Router);
        routerInstance.navigate([notificacion.url]);
      });
    }
    this.cerrarMenu();
  }
}