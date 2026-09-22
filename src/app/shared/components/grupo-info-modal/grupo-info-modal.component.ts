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
  mostrarHistorial = signal(false);

  editNombre = signal('');
  editDescripcion = signal('');

  ngOnInit(): void {
    this.cargarGrupo();
    this.cargarMiembros();
    this.cargarHistorial();
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

  toggleHistorial(): void {
    this.mostrarHistorial.update(v => !v);
  }

  // ===== HELPERS HISTORIAL =====
  getAccionIcono(accion: string): string {
    const map: Record<string, string> = {
      'CREAR': '🎉',
      'EDITAR_NOMBRE': '✏️',
      'EDITAR_DESC': '📝',
      'CAMBIAR_FOTO': '🖼️',
      'ELIMINAR_FOTO': '🗑️',
      'LINK_CREADO': '🔗',
      'LINK_DESACTIVADO': '🔒',
      'MIEMBRO_UNIDO': '👥',
      'INVITAR': '✉️',
      'EXPULSAR': '🚫',
      'SALIR': '👋',
      'ELIMINAR': '🗑️'
    };
    return map[accion] || '📌';
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
}