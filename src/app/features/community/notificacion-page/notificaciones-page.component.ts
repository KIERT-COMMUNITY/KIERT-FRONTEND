// src/app/features/community/notificacion-page/notificaciones-page.component.ts
import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { NotificationService, Notificacion, TipoNotificacion } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

type FiltroTipo =
  | 'todas'
  | 'no-leidas'
  | 'like'
  | 'comentario'
  | 'respuesta'
  | 'solicitud'
  | 'sistema'
  | 'REPORTE_NUEVO'
  | 'REPORTE_RESUELTO'
  | 'REPORTE_RECHAZADO'
  | 'ADVERTENCIA'
  | 'CONTENIDO_ELIMINADO'
  | 'USUARIO_BANEADO';

export interface TotalesPorTipo {
  like: number;
  comentario: number;
  respuesta: number;
  solicitud: number;
  sistema: number;
  INVITACION_GRUPO: number;
  REPORTE_NUEVO: number;
  REPORTE_RESUELTO: number;
  REPORTE_RECHAZADO: number;
  ADVERTENCIA: number;
  CONTENIDO_ELIMINADO: number;
  USUARIO_BANEADO: number;
}

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

  // ===== MODAL DE CONFIRMACIÓN (NUEVO) =====
  mostrarModalEliminar = signal(false);
  idAEliminar = signal<number | null>(null);
  textoConfirmacion = signal('');

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

  totalNoLeidas = computed(() => this.notificaciones().filter(n => !n.leida).length);
  totalLeidas = computed(() => this.notificaciones().filter(n => n.leida).length);

  totalPorTipo = computed((): TotalesPorTipo => {
    const tipos: TotalesPorTipo = {
      like: 0, comentario: 0, respuesta: 0, solicitud: 0, sistema: 0,
      INVITACION_GRUPO: 0, REPORTE_NUEVO: 0, REPORTE_RESUELTO: 0,
      REPORTE_RECHAZADO: 0, ADVERTENCIA: 0, CONTENIDO_ELIMINADO: 0, USUARIO_BANEADO: 0
    };

    this.notificaciones().forEach(n => {
      const key = n.tipo as keyof TotalesPorTipo;
      if (tipos[key] !== undefined) tipos[key]++;
    });

    return tipos;
  });

  haySeleccionadas = computed(() => this.seleccionadas().size > 0);

  notificacionesDeReporte = computed(() =>
    this.notificaciones().filter(n => this.notificationService.esNotificacionDeReporte(n.tipo))
  );

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
  cambiarFiltro(filtro: FiltroTipo): void { this.filtroActual.set(filtro); }
  limpiarFiltros(): void { this.filtroActual.set('todas'); this.busqueda.set(''); }

  // ===== ACCIONES =====
  marcarComoLeida(id: number, event?: Event): void {
    event?.stopPropagation();
    this.notificationService.marcarComoLeida(id).subscribe({
      next: () => {
        this.notificaciones.update(lista => lista.map(n => n.id === id ? { ...n, leida: true } : n));
      },
      error: () => {}
    });
  }

  marcarComoNoLeida(id: number, event?: Event): void {
    event?.stopPropagation();
    this.notificaciones.update(lista => lista.map(n => n.id === id ? { ...n, leida: false } : n));
  }

  marcarTodasComoLeidas(): void {
    const ids = this.notificaciones().filter(n => !n.leida).map(n => n.id);
    if (ids.length === 0) return;
    this.notificationService.marcarTodasComoLeidas(ids).subscribe({
      next: () => this.notificaciones.update(lista => lista.map(n => ({ ...n, leida: true }))),
      error: () => {}
    });
  }

  // ===== LOGICA DE ELIMINACIÓN CON MODAL =====
  abrirConfirmacionEliminar(id: number, event?: Event): void {
    event?.stopPropagation();
    this.idAEliminar.set(id);
    this.textoConfirmacion.set('¿Seguro que quieres eliminar esta notificación?');
    this.mostrarModalEliminar.set(true);
  }

  abrirConfirmacionEliminarTodas(): void {
    this.idAEliminar.set(null); // null significa "eliminar todas"
    this.textoConfirmacion.set('¿Eliminar TODAS las notificaciones? Esta acción no se puede deshacer.');
    this.mostrarModalEliminar.set(true);
  }

  abrirConfirmacionEliminarSeleccionadas(): void {
    this.idAEliminar.set(null); // null y seleccionadas > 0 significa "eliminar seleccionadas"
    this.textoConfirmacion.set(`¿Eliminar las ${this.seleccionadas().size} notificaciones seleccionadas?`);
    this.mostrarModalEliminar.set(true);
  }

  cerrarModalEliminar(): void {
    this.mostrarModalEliminar.set(false);
    this.idAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const id = this.idAEliminar();
    const seleccionadas = this.seleccionadas();

    if (id !== null) {
      // Eliminar una sola
      this.notificationService.eliminarNotificacion(id).subscribe({
        next: () => {
          this.notificaciones.update(lista => lista.filter(n => n.id !== id));
          this.cerrarModalEliminar();
        },
        error: () => this.cerrarModalEliminar()
      });
    } else if (seleccionadas.size > 0) {
      // Eliminar seleccionadas
      const ids = Array.from(seleccionadas);
      ids.forEach(i => this.notificationService.eliminarNotificacion(i).subscribe());
      this.notificaciones.update(lista => lista.filter(n => !seleccionadas.has(n.id)));
      this.seleccionadas.set(new Set());
      this.modoSeleccion.set(false);
      this.cerrarModalEliminar();
    } else {
      // Eliminar todas
      const ids = this.notificaciones().map(n => n.id);
      ids.forEach(i => this.notificationService.eliminarNotificacion(i).subscribe());
      this.notificaciones.set([]);
      this.seleccionadas.set(new Set());
      this.modoSeleccion.set(false);
      this.cerrarModalEliminar();
    }
  }

  // ===== SELECCIÓN =====
  toggleSeleccion(id: number, event: Event): void {
    event.stopPropagation();
    this.seleccionadas.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  estaSeleccionada(id: number): boolean { return this.seleccionadas().has(id); }

  toggleModoSeleccion(): void {
    this.modoSeleccion.update(val => !val);
    if (!this.modoSeleccion()) this.seleccionadas.set(new Set());
  }

  seleccionarTodas(): void {
    const ids = this.notificacionesFiltradas().map(n => n.id);
    this.seleccionadas.set(new Set(ids));
  }

  deseleccionarTodas(): void { this.seleccionadas.set(new Set()); }

  onClickNotificacion(notificacion: Notificacion): void {
    if (this.modoSeleccion()) {
      this.toggleSeleccion(notificacion.id, new Event('click'));
      return;
    }

    if (!notificacion.leida) this.marcarComoLeida(notificacion.id);

    const navegacion = this.construirNavegacion(notificacion);
    if (navegacion) {
      this.router.navigate(navegacion.ruta, { queryParams: navegacion.queryParams });
    }
  }

  private construirNavegacion(notificacion: Notificacion): { ruta: any[]; queryParams?: Record<string, any>; } | null {
    const n = notificacion;
    switch (n.tipo) {
      case 'comentario':
        if (n.postId) return { ruta: ['/comunidad', n.postId], queryParams: n.comentarioId ? { comentarioId: n.comentarioId } : undefined };
        break;
      case 'respuesta':
        if (n.postId) {
          const qp: Record<string, any> = {};
          if (n.comentarioId) qp['comentarioId'] = n.comentarioId;
          if (n.respuestaId) qp['respuestaId'] = n.respuestaId;
          return { ruta: ['/comunidad', n.postId], queryParams: Object.keys(qp).length > 0 ? qp : undefined };
        }
        break;
      case 'like':
        if (n.postId) return { ruta: ['/comunidad', n.postId] };
        break;
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

  volver(): void { this.router.navigate(['/comunidad']); }

  // ===== UTILIDADES =====
  getColorTipo(tipo: string): string { return this.notificationService.getColorTipo(tipo as TipoNotificacion); }
  getEtiquetaTipo(tipo: string): string { return this.notificationService.getEtiquetaTipo(tipo as TipoNotificacion); }

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
    return new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}