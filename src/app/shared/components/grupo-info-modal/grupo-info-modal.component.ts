// src/app/shared/components/grupo-info-modal/grupo-info-modal.component.ts
import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrupoService, Grupo, MiembroGrupo, GrupoHistorial } from '../../../core/services/grupo.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-grupo-info-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grupo-info-modal.component.html',
  styleUrl: './grupo-info-modal.component.scss'
})
export class GrupoInfoModalComponent implements OnInit {
  private grupoService = inject(GrupoService);
  private router = inject(Router);
  public authService = inject(AuthService);

  @Input() grupoId!: number;
  @Output() cerrar = new EventEmitter<void>();
  @Output() grupoActualizado = new EventEmitter<Grupo>();
  @Output() abrirInvitarLink = new EventEmitter<void>();

  grupo = signal<Grupo | null>(null);
  miembros = signal<MiembroGrupo[]>([]);
  historial = signal<GrupoHistorial[]>([]);
  cargando = signal(true);
  subiendoFoto = signal(false);
  editando = signal(false);

  // ✅ NUEVO: control de tabs
  tabActivo: 'miembros' | 'historial' = 'miembros';

  editNombre = signal('');
  editDescripcion = signal('');

  ngOnInit(): void {
    this.cargarGrupo();
    this.cargarMiembros();
    this.cargarHistorial();
  }

  // ✅ NUEVO: cambiar de tab
  cambiarTab(tab: 'miembros' | 'historial'): void {
    this.tabActivo = tab;
  }

  cargarGrupo(): void {
    this.grupoService.obtenerGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.editNombre.set(g.nombre);
        this.editDescripcion.set(g.descripcion || '');
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  cargarMiembros(): void {
    this.grupoService.listarMiembros(this.grupoId).subscribe({
      next: (m) => this.miembros.set(m)
    });
  }

  cargarHistorial(): void {
    this.grupoService.listarHistorial(this.grupoId).subscribe({
      next: (h) => this.historial.set(h),
      error: () => {}
    });
  }

  esAdmin(): boolean {
    return this.grupo()?.rolDelUsuario === 'ADMIN';
  }

  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    this.subiendoFoto.set(true);
    this.grupoService.actualizarFotoGrupo(this.grupoId, file).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.grupoActualizado.emit(g);
        this.subiendoFoto.set(false);
        this.cargarHistorial();
      },
      error: (err) => {
        alert(err?.error?.error || 'Error al subir foto');
        this.subiendoFoto.set(false);
      }
    });
    input.value = '';
  }

  eliminarFoto(): void {
    if (!confirm('¿Eliminar la foto del grupo?')) return;
    this.grupoService.eliminarFotoGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.grupoActualizado.emit(g);
        this.cargarHistorial();
      }
    });
  }

  toggleEditar(): void {
    this.editando.update(v => !v);
    if (this.editando() && this.grupo()) {
      this.editNombre.set(this.grupo()!.nombre);
      this.editDescripcion.set(this.grupo()!.descripcion || '');
    }
  }

  guardarInfo(): void {
    if (!this.editNombre().trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    this.grupoService.actualizarInfoGrupo(this.grupoId, this.editNombre(), this.editDescripcion())
      .subscribe({
        next: (g) => {
          this.grupo.set(g);
          this.grupoActualizado.emit(g);
          this.editando.set(false);
          this.cargarHistorial();
        },
        error: (err) => alert(err?.error?.error || 'Error al guardar')
      });
  }

  invitar(): void {
    this.cerrar.emit();
    this.abrirInvitarLink.emit();
  }

  abrirPerfil(usuarioId: number): void {
    this.cerrar.emit();
    this.router.navigate(['/usuario', usuarioId]);
  }

  // ===== HELPERS HISTORIAL =====
  getAccionIcono(accion: string): string {
    const map: Record<string, string> = {
      'CREAR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      'EDITAR_NOMBRE': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
      'EDITAR_DESC': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      'CAMBIAR_FOTO': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      'ELIMINAR_FOTO': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
      'LINK_CREADO': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      'LINK_DESACTIVADO': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      'MIEMBRO_UNIDO': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      'INVITAR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
      'EXPULSAR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
      'SALIR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
      'ELIMINAR': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
    };
    return map[accion] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/></svg>';
  }

  getAccionTexto(accion: string): string {
    const map: Record<string, string> = {
      'CREAR': 'Creó el grupo',
      'EDITAR_NOMBRE': 'Cambió el nombre',
      'EDITAR_DESC': 'Cambió la descripción',
      'CAMBIAR_FOTO': 'Cambió la foto',
      'ELIMINAR_FOTO': 'Eliminó la foto',
      'LINK_CREADO': 'Generó un link',
      'LINK_DESACTIVADO': 'Desactivó un link',
      'MIEMBRO_UNIDO': 'Se unió al grupo',
      'INVITAR': 'Invitó a un usuario',
      'EXPULSAR': 'Expulsó a un miembro',
      'SALIR': 'Salió del grupo',
      'ELIMINAR': 'Eliminó el grupo'
    };
    return map[accion] || accion;
  }

  formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  formatearRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'Ahora';
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Hace ${d} d`;
    return this.formatearFechaHora(fecha);
  }

  getEstadoMiembro(m: MiembroGrupo): string {
    if (m.enLinea) return 'En línea';

    if (m.ultimaConexion) {
      const fecha = new Date(m.ultimaConexion);
      const ahora = new Date();
      const diffMs = ahora.getTime() - fecha.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffH = Math.floor(diffMin / 60);
      const diffD = Math.floor(diffH / 24);

      if (diffMin < 1) return 'Últ. vez hace unos segundos';
      if (diffMin < 60) return `Últ. vez hace ${diffMin} min`;
      if (diffH < 24) return `Últ. vez hace ${diffH} h`;
      if (diffD < 7) return `Últ. vez hace ${diffD} d`;

      return `Últ. vez ${fecha.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      })}`;
    }

    return 'Desconectado';
  }
  // Dentro de la clase GrupoInfoModalComponent

// ===== CIERRE SEGURO =====
private clickIniciadoEnOverlay = false;

onOverlayMouseDown(event: MouseEvent): void {
  // Solo cerrar si el mousedown empezó en el overlay mismo
  if (event.target === event.currentTarget) {
    this.clickIniciadoEnOverlay = true;
  }
}

// Escuchar el click (que se dispara después del mousedown)
// Solo cierra si el mousedown también fue en el overlay
onOverlayClick(event: MouseEvent): void {
  if (event.target === event.currentTarget && this.clickIniciadoEnOverlay) {
    this.clickIniciadoEnOverlay = false;
    this.cerrar.emit();
  }
}

onCerrar(): void {
  this.cerrar.emit();
}
}