import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { NotificationService, Notificacion } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

type FiltroTipo = 'todas' | 'no-leidas' | 'like' | 'comentario' | 'respuesta' | 'solicitud' | 'sistema';

@Component({
  selector: 'kiert-notificaciones-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notificaciones-page.component.html',
  styleUrl: './notificaciones-page.component.scss'
})
export class NotificacionesPageComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== DATOS =====
  notificaciones = signal<Notificacion[]>([]);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);

  // ===== FILTROS =====
  filtroActual = signal<FiltroTipo>('todas');
  busqueda = signal('');

  // ===== SELECCIÓN MÚLTIPLE =====
  seleccionadas = signal<Set<number>>(new Set());
  modoSeleccion = signal(false);

  // ===== COMPUTED =====
  notificacionesFiltradas = computed(() => {
    let resultado = this.notificaciones();
    const filtro = this.filtroActual();
    const query = this.busqueda().toLowerCase().trim();

    if (filtro === 'no-leidas') {
      resultado = resultado.filter(n => !n.leida);
    } else if (filtro !== 'todas') {
      resultado = resultado.filter(n => n.tipo === filtro);
    }

    if (query) {
      resultado = resultado.filter(n =>
        n.mensaje?.toLowerCase().includes(query)
      );
    }

    return resultado;
  });

  totalNoLeidas = computed(() =>
    this.notificaciones().filter(n => !n.leida).length
  );

  totalLeidas = computed(() =>
    this.notificaciones().filter(n => n.leida).length
  );

  // ✅ TIPO EXPLÍCITO - Sin Record<string, number>
  totalPorTipo = computed((): {
    like: number;
    comentario: number;
    respuesta: number;
    solicitud: number;
    sistema: number;
  } => {
    const tipos = {
      like: 0,
      comentario: 0,
      respuesta: 0,
      solicitud: 0,
      sistema: 0
    };

    this.notificaciones().forEach(n => {
      const tipo = n.tipo?.toLowerCase() as keyof typeof tipos;
      if (tipo && tipos[tipo] !== undefined) {
        tipos[tipo]++;
      }
    });

    return tipos;
  });

  haySeleccionadas = computed(() => this.seleccionadas().size > 0);

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  cargarNotificaciones(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.notificationService.obtenerNotificaciones().subscribe({
      next: (data) => {
        this.notificaciones.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar notificaciones:', err);
        this.errorMsg.set('Error al cargar notificaciones');
        this.cargando.set(false);
      }
    });
  }

  // ===== FILTROS =====
  cambiarFiltro(filtro: FiltroTipo): void {
    this.filtroActual.set(filtro);
  }

  limpiarFiltros(): void {
    this.filtroActual.set('todas');
    this.busqueda.set('');
  }

  // ===== ACCIONES =====
  marcarComoLeida(id: number, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.marcarComoLeida(id).subscribe({
      next: () => {
        this.notificaciones.update(lista =>
          lista.map(n => n.id === id ? { ...n, leida: true } : n)
        );
      },
      error: () => {}
    });
  }

  marcarComoNoLeida(id: number, event?: Event): void {
    event?.stopPropagation();
    this.notificaciones.update(lista =>
      lista.map(n => n.id === id ? { ...n, leida: false } : n)
    );
  }

  marcarTodasComoLeidas(): void {
    const ids = this.notificaciones().filter(n => !n.leida).map(n => n.id);
    if (ids.length === 0) return;

    this.notificationService.marcarTodasComoLeidas(ids).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.map(n => ({ ...n, leida: true })));
      },
      error: () => {}
    });
  }

  eliminarNotificacion(id: number, event?: Event): void {
    event?.stopPropagation();
    if (!confirm('¿Eliminar esta notificación?')) return;

    this.notificationService.eliminarNotificacion(id).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.filter(n => n.id !== id));
      },
      error: () => {}
    });
  }

  eliminarSeleccionadas(): void {
    const ids = Array.from(this.seleccionadas());
    if (ids.length === 0) return;
    if (!confirm(`¿Eliminar ${ids.length} notificaciones?`)) return;

    ids.forEach(id => {
      this.notificationService.eliminarNotificacion(id).subscribe({
        next: () => {
          this.notificaciones.update(lista => lista.filter(n => n.id !== id));
        }
      });
    });

    this.seleccionadas.set(new Set());
    this.modoSeleccion.set(false);
  }

  eliminarTodas(): void {
    if (!confirm('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.')) return;

    const ids = this.notificaciones().map(n => n.id);
    ids.forEach(id => {
      this.notificationService.eliminarNotificacion(id).subscribe();
    });

    this.notificaciones.set([]);
    this.seleccionadas.set(new Set());
    this.modoSeleccion.set(false);
  }

  // ===== SELECCIÓN =====
  toggleSeleccion(id: number, event: Event): void {
    event.stopPropagation();
    this.seleccionadas.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(id)) {
        nuevo.delete(id);
      } else {
        nuevo.add(id);
      }
      return nuevo;
    });
  }

  estaSeleccionada(id: number): boolean {
    return this.seleccionadas().has(id);
  }

  toggleModoSeleccion(): void {
    this.modoSeleccion.update(val => !val);
    if (!this.modoSeleccion()) {
      this.seleccionadas.set(new Set());
    }
  }

  seleccionarTodas(): void {
    const ids = this.notificacionesFiltradas().map(n => n.id);
    this.seleccionadas.set(new Set(ids));
  }

  deseleccionarTodas(): void {
    this.seleccionadas.set(new Set());
  }

  // ===== NAVEGACIÓN =====
  onClickNotificacion(notificacion: Notificacion): void {
    if (this.modoSeleccion()) {
      this.toggleSeleccion(notificacion.id, new Event('click'));
      return;
    }

    if (!notificacion.leida) {
      this.marcarComoLeida(notificacion.id);
    }

    if (notificacion.url) {
      this.router.navigate([notificacion.url]);
    }
  }

  volver(): void {
    this.router.navigate(['/comunidad']);
  }

  // ===== UTILIDADES =====
  getColorTipo(tipo: string): string {
    const colores: Record<string, string> = {
      'like': '#f85149',
      'comentario': '#2dd4bf',
      'respuesta': '#58a6ff',
      'solicitud': '#f9ca24',
      'sistema': '#8b98a5'
    };
    return colores[tipo?.toLowerCase()] || '#8b98a5';
  }

  getEtiquetaTipo(tipo: string): string {
    const etiquetas: Record<string, string> = {
      'like': 'Me gusta',
      'comentario': 'Comentario',
      'respuesta': 'Respuesta',
      'solicitud': 'Solicitud',
      'sistema': 'Sistema'
    };
    return etiquetas[tipo?.toLowerCase()] || 'Notificación';
  }

  getLabelFiltro(filtro: FiltroTipo): string {
    const labels: Record<FiltroTipo, string> = {
      'todas': 'Todas',
      'no-leidas': 'No leídas',
      'like': 'Me gusta',
      'comentario': 'Comentarios',
      'respuesta': 'Respuestas',
      'solicitud': 'Solicitudes',
      'sistema': 'Sistema'
    };
    return labels[filtro];
  }

  formatearFecha(fecha: Date): string {
    const ahora = new Date();
    const diff = ahora.getTime() - new Date(fecha).getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Ahora mismo';
    if (minutos < 60) return `Hace ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
    if (dias < 7) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }
}