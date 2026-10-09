// src/app/shared/components/grupo-info-modal/grupo-info-modal.component.ts
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import {
  GrupoService,
  Grupo,
  MiembroGrupo,
  GrupoHistorial,
} from "../../../core/services/grupo.service";
import { UserService } from "../../../core/services/user.service";
import { User } from "../../../core/models/user.model";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "kiert-grupo-info-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./grupo-info-modal.component.html",
  styleUrl: "./grupo-info-modal.component.scss",
})
export class GrupoInfoModalComponent implements OnInit, OnDestroy {
  private grupoService = inject(GrupoService);
  private userService = inject(UserService);
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
  tabActivo: "miembros" | "historial" = "miembros";
  editNombre = signal("");
  editDescripcion = signal("");

  agregandoMiembros = signal(false);
  busquedaUsuario = signal("");
  resultadosUsuarios = signal<User[]>([]);
  usuariosSeleccionados = signal<Set<number>>(new Set());
  buscandoUsuarios = signal(false);
  enviandoInvitaciones = signal(false);
  errorInvitacion = signal<string | null>(null);
  exitoInvitacion = signal<string | null>(null);

  private clickIniciadoEnOverlay = false;
  private busquedaTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshInterval: any = null;   // ✅ NUEVO: refresca miembros

  // ============================================================
  // CICLO DE VIDA
  // ============================================================
  ngOnInit(): void {
    this.cargarGrupo();
    this.cargarMiembros();
    this.cargarHistorial();

    // ✅ Refrescar miembros cada 8 s para ver cambios online/offline
    this.refreshInterval = setInterval(() => {
      this.cargarMiembros();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.busquedaTimer) {
      clearTimeout(this.busquedaTimer);
      this.busquedaTimer = null;
    }
  }

  cambiarTab(tab: "miembros" | "historial"): void {
    this.tabActivo = tab;
  }

  // ============================================================
  // CARGA DE DATOS
  // ============================================================
  cargarGrupo(): void {
    this.grupoService.obtenerGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.editNombre.set(g.nombre);
        this.editDescripcion.set(g.descripcion || "");
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cargarMiembros(): void {
    this.grupoService.listarMiembros(this.grupoId).subscribe({
      next: (lista) => this.miembros.set(lista),
    });
  }

  cargarHistorial(): void {
    this.grupoService.listarHistorial(this.grupoId).subscribe({
      next: (lista) => this.historial.set(lista),
      error: () => {},
    });
  }

  esAdmin(): boolean {
    return this.grupo()?.rolDelUsuario === "ADMIN";
  }

  // ============================================================
  // AGREGAR MIEMBROS
  // ============================================================
  abrirAgregarMiembros(): void {
    if (!this.esAdmin()) return;
    this.agregandoMiembros.set(true);
    this.busquedaUsuario.set("");
    this.resultadosUsuarios.set([]);
    this.usuariosSeleccionados.set(new Set());
    this.errorInvitacion.set(null);
    this.exitoInvitacion.set(null);
  }

  cerrarAgregarMiembros(): void {
    if (this.enviandoInvitaciones()) return;
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    this.agregandoMiembros.set(false);
    this.busquedaUsuario.set("");
    this.resultadosUsuarios.set([]);
    this.usuariosSeleccionados.set(new Set());
    this.errorInvitacion.set(null);
    this.exitoInvitacion.set(null);
  }

  onBusquedaUsuarioChange(valor: string): void {
    this.busquedaUsuario.set(valor);
    this.errorInvitacion.set(null);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    const query = valor.trim();
    if (query.length < 2) {
      this.resultadosUsuarios.set([]);
      this.buscandoUsuarios.set(false);
      return;
    }
    this.busquedaTimer = setTimeout(() => this.buscarUsuarios(), 300);
  }

  buscarUsuarios(): void {
    const query = this.busquedaUsuario().trim();
    if (query.length < 2) return;
    this.buscandoUsuarios.set(true);
    this.userService.buscarUsuarios(query).subscribe({
      next: (usuarios) => {
        const idsMiembros = new Set(this.miembros().map((m) => m.usuarioId));
        this.resultadosUsuarios.set(
          usuarios.filter((u) => !idsMiembros.has(u.id)),
        );
        this.buscandoUsuarios.set(false);
      },
      error: () => {
        this.resultadosUsuarios.set([]);
        this.buscandoUsuarios.set(false);
        this.errorInvitacion.set("No se pudo realizar la búsqueda.");
      },
    });
  }

  toggleUsuario(userId: number): void {
    if (this.miembros().some((m) => m.usuarioId === userId)) return;
    this.usuariosSeleccionados.update((actuales) => {
      const nuevos = new Set(actuales);
      nuevos.has(userId) ? nuevos.delete(userId) : nuevos.add(userId);
      return nuevos;
    });
  }

  estaSeleccionado(userId: number): boolean {
    return this.usuariosSeleccionados().has(userId);
  }

  enviarInvitaciones(): void {
    const ids = Array.from(this.usuariosSeleccionados());
    if (!this.esAdmin() || ids.length === 0 || this.enviandoInvitaciones())
      return;
    this.enviandoInvitaciones.set(true);
    this.errorInvitacion.set(null);
    this.exitoInvitacion.set(null);
    this.grupoService.invitarUsuarios(this.grupoId, ids).subscribe({
      next: (respuesta) => {
        this.enviandoInvitaciones.set(false);
        this.exitoInvitacion.set(respuesta?.mensaje || "Invitaciones enviadas");
        this.usuariosSeleccionados.set(new Set());
        this.busquedaUsuario.set("");
        this.resultadosUsuarios.set([]);
        this.cargarHistorial();
        setTimeout(() => {
          this.agregandoMiembros.set(false);
          this.exitoInvitacion.set(null);
          this.tabActivo = "miembros";
        }, 1200);
      },
      error: (err) => {
        this.enviandoInvitaciones.set(false);
        this.errorInvitacion.set(
          err?.error?.error || "Error al enviar invitaciones",
        );
      },
    });
  }

  invitarConLink(): void {
    this.cerrar.emit();
    this.abrirInvitarLink.emit();
  }

  // ============================================================
  // FOTO DEL GRUPO
  // ============================================================
  onFotoSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no debe superar 5MB");
      input.value = "";
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
        alert(err?.error?.error || "Error al subir foto");
        this.subiendoFoto.set(false);
      },
    });
    input.value = "";
  }

  eliminarFoto(): void {
    if (!confirm("¿Eliminar la foto del grupo?")) return;
    this.grupoService.eliminarFotoGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.grupoActualizado.emit(g);
        this.cargarHistorial();
      },
    });
  }

  // ============================================================
  // EDITAR INFO
  // ============================================================
  toggleEditar(): void {
    this.editando.update((valor) => !valor);
    if (this.editando() && this.grupo()) {
      this.editNombre.set(this.grupo()!.nombre);
      this.editDescripcion.set(this.grupo()!.descripcion || "");
    }
  }

  guardarInfo(): void {
    const nombre = this.editNombre().trim();
    if (!nombre) {
      alert("El nombre es obligatorio");
      return;
    }
    this.grupoService
      .actualizarInfoGrupo(this.grupoId, nombre, this.editDescripcion())
      .subscribe({
        next: (g) => {
          this.grupo.set(g);
          this.grupoActualizado.emit(g);
          this.editando.set(false);
          this.cargarHistorial();
        },
        error: (err) => alert(err?.error?.error || "Error al guardar"),
      });
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  abrirPerfil(usuarioId: number): void {
    this.cerrar.emit();
    this.router.navigate(["/usuario", usuarioId]);
  }

  // ============================================================
  // ICONOS Y TEXTOS DEL HISTORIAL
  // ============================================================
  getAccionIcono(accion: string): string {
    const iconos: Record<string, string> = {
      CREAR: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
      EDITAR_NOMBRE:
        '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      EDITAR_DESC:
        '<path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"/><path d="M14 2v6h6"/>',
      CAMBIAR_FOTO:
        '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
      ELIMINAR_FOTO: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6"/>',
      LINK_CREADO:
        '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/>',
      LINK_DESACTIVADO:
        '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
      MIEMBRO_UNIDO:
        '<circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M19 8v6M22 11h-6"/>',
      INVITAR:
        '<circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M19 8v6M22 11h-6"/>',
      EXPULSAR: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
      SALIR:
        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
      ELIMINAR: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6"/>',
    };
    const contenido =
      iconos[accion] ||
      '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;
  }

  getAccionTexto(accion: string): string {
    const acciones: Record<string, string> = {
      CREAR: "Creó el grupo",
      EDITAR_NOMBRE: "Cambió el nombre",
      EDITAR_DESC: "Cambió la descripción",
      CAMBIAR_FOTO: "Cambió la foto",
      ELIMINAR_FOTO: "Eliminó la foto",
      LINK_CREADO: "Generó un link",
      LINK_DESACTIVADO: "Desactivó un link",
      MIEMBRO_UNIDO: "Se unió al grupo",
      INVITAR: "Invitó a un usuario",
      EXPULSAR: "Expulsó a un miembro",
      SALIR: "Salió del grupo",
      ELIMINAR: "Eliminó el grupo",
    };
    return acciones[accion] || accion;
  }

  // ============================================================
  // FORMATO DE FECHAS
  // ============================================================
  formatearFechaHora(fecha: string): string {
    return new Date(fecha).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatearRelativo(fecha: string): string {
    const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
    if (min < 1) return "Ahora";
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    return d < 7 ? `Hace ${d} d` : this.formatearFechaHora(fecha);
  }

  // ============================================================
  // ✅ PARSEO UTC — arregla "hace 5 h" cuando fue hace 3 s
  // ============================================================
  private parsearFechaUtc(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;

    const s = String(fecha);
    const tieneZona = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
    return new Date(tieneZona ? s : s + 'Z');
  }

  // ============================================================
  // ✅ ESTADO DEL MIEMBRO (online / offline)
  // ============================================================
  getEstadoMiembro(m: MiembroGrupo): string {
    // 1) Si está online, mostrarlo siempre primero
    if (m.enLinea) return "En línea";

    // 2) Sin última conexión → desconectado
    const fecha = this.parsearFechaUtc(m.ultimaConexion);
    if (!fecha) return "Desconectado";

    // 3) Calcular diferencia
    const diffMs = Date.now() - fecha.getTime();
    if (diffMs < 0) return "Últ. vez hace unos segundos";

    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "Últ. vez hace unos segundos";
    if (min < 60) return `Últ. vez hace ${min} min`;

    const h = Math.floor(min / 60);
    if (h < 24) return `Últ. vez hace ${h} h`;

    const d = Math.floor(h / 24);
    if (d < 7) return `Últ. vez hace ${d} d`;

    return `Últ. vez ${fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    })}`;
  }

  // ============================================================
  // OVERLAY
  // ============================================================
  onOverlayMouseDown(event: MouseEvent): void {
    this.clickIniciadoEnOverlay = event.target === event.currentTarget;
  }

  onOverlayClick(event: MouseEvent): void {
    const cerrarDesdeOverlay =
      event.target === event.currentTarget && this.clickIniciadoEnOverlay;
    this.clickIniciadoEnOverlay = false;
    if (cerrarDesdeOverlay && !this.enviandoInvitaciones()) this.cerrar.emit();
  }

  onCerrar(): void {
    if (!this.enviandoInvitaciones()) this.cerrar.emit();
  }
}