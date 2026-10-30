// src/app/shared/components/grupo-info-modal/grupo-info-modal.component.ts
import {
  Component,
  ElementRef,
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
import { safeUrl } from "../../utils/url-sanitizer";

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
  private host = inject(ElementRef<HTMLElement>);

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

  // ngModel normal (strings), mas seguro que signals
  editNombre = "";
  editDescripcion = "";

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
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private cierreTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // Portal: mover el modal al <body> para que nada lo tape ni lo recorte
    try {
      document.body.appendChild(this.host.nativeElement);
    } catch {}

    this.cargarGrupo();
    this.cargarMiembros();
    this.cargarHistorial();

    this.refreshInterval = setInterval(() => this.cargarMiembros(), 8000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.busquedaTimer) clearTimeout(this.busquedaTimer);
    if (this.cierreTimer) clearTimeout(this.cierreTimer);
    this.refreshInterval = null;
    this.busquedaTimer = null;
    this.cierreTimer = null;
    try {
      this.host.nativeElement.remove();
    } catch {}
  }

  // ===== HELPERS TEMPLATE =====
  foto(url: string | null | undefined): string | null {
    return url ? safeUrl(url) : null;
  }

  inicial(nombre: string | null | undefined): string {
    return (nombre || "?").charAt(0).toUpperCase();
  }

  cambiarTab(tab: "miembros" | "historial"): void {
    this.tabActivo = tab;
  }

  // ===== CARGA =====
  cargarGrupo(): void {
    this.grupoService.obtenerGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.editNombre = g.nombre;
        this.editDescripcion = g.descripcion || "";
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  cargarMiembros(): void {
    this.grupoService.listarMiembros(this.grupoId).subscribe({
      next: (lista) => this.miembros.set(Array.isArray(lista) ? lista : []),
      error: () => {},
    });
  }

  cargarHistorial(): void {
    this.grupoService.listarHistorial(this.grupoId).subscribe({
      next: (lista) => this.historial.set(Array.isArray(lista) ? lista : []),
      error: () => {},
    });
  }

  esAdmin(): boolean {
    return this.grupo()?.rolDelUsuario === "ADMIN";
  }

  // ===== ANADIR MIEMBROS =====
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
    const query = (valor || "").trim();
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
          (usuarios || []).filter((u) => !idsMiembros.has(u.id)),
        );
        this.buscandoUsuarios.set(false);
      },
      error: () => {
        this.resultadosUsuarios.set([]);
        this.buscandoUsuarios.set(false);
        this.errorInvitacion.set("No se pudo realizar la busqueda.");
      },
    });
  }

  toggleUsuario(userId: number): void {
    if (this.miembros().some((m) => m.usuarioId === userId)) return;
    this.usuariosSeleccionados.update((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(userId)) nuevos.delete(userId);
      else nuevos.add(userId);
      return nuevos;
    });
  }

  estaSeleccionado(userId: number): boolean {
    return this.usuariosSeleccionados().has(userId);
  }

  enviarInvitaciones(): void {
    const ids = Array.from(this.usuariosSeleccionados());
    if (!this.esAdmin() || ids.length === 0 || this.enviandoInvitaciones()) return;

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
        this.cierreTimer = setTimeout(() => {
          this.agregandoMiembros.set(false);
          this.exitoInvitacion.set(null);
          this.tabActivo = "miembros";
        }, 1200);
      },
      error: (err) => {
        this.enviandoInvitaciones.set(false);
        this.errorInvitacion.set(err?.error?.error || "Error al enviar invitaciones");
      },
    });
  }

  invitarConLink(): void {
    this.cerrar.emit();
    this.abrirInvitarLink.emit();
  }

  // ===== FOTO DEL GRUPO =====
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
    if (!confirm("Eliminar la foto del grupo?")) return;
    this.grupoService.eliminarFotoGrupo(this.grupoId).subscribe({
      next: (g) => {
        this.grupo.set(g);
        this.grupoActualizado.emit(g);
        this.cargarHistorial();
      },
    });
  }

  // ===== EDICION =====
  toggleEditar(): void {
    this.editando.update((v) => !v);
    if (this.editando() && this.grupo()) {
      this.editNombre = this.grupo()!.nombre;
      this.editDescripcion = this.grupo()!.descripcion || "";
    }
  }

  guardarInfo(): void {
    const nombre = this.editNombre.trim();
    if (!nombre) {
      alert("El nombre es obligatorio");
      return;
    }
    this.grupoService
      .actualizarInfoGrupo(this.grupoId, nombre, this.editDescripcion)
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

  abrirPerfil(usuarioId: number): void {
    this.cerrar.emit();
    this.router.navigate(["/usuario", usuarioId]);
  }

  // ===== HISTORIAL =====
  getAccionIcono(accion: string): string {
    const iconos: Record<string, string> = {
      CREAR: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
      EDITAR_NOMBRE: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
      EDITAR_DESC: '<path d="M14 2H6a2 2 0 0 0-2 2v16h16V8z"/><path d="M14 2v6h6"/>',
      CAMBIAR_FOTO: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
      ELIMINAR_FOTO: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6"/>',
      LINK_CREADO: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-2 2"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l2-2"/>',
      LINK_DESACTIVADO: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
      MIEMBRO_UNIDO: '<circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M19 8v6M22 11h-6"/>',
      INVITAR: '<circle cx="9" cy="7" r="4"/><path d="M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2M19 8v6M22 11h-6"/>',
      EXPULSAR: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>',
      SALIR: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
      ELIMINAR: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 16H6L5 6"/>',
    };
    const contenido =
      iconos[accion] || '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>';
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;
  }

  getAccionTexto(accion: string): string {
    const acciones: Record<string, string> = {
      CREAR: "Creo el grupo",
      EDITAR_NOMBRE: "Cambio el nombre",
      EDITAR_DESC: "Cambio la descripcion",
      CAMBIAR_FOTO: "Cambio la foto",
      ELIMINAR_FOTO: "Elimino la foto",
      LINK_CREADO: "Genero un link",
      LINK_DESACTIVADO: "Desactivo un link",
      MIEMBRO_UNIDO: "Se unio al grupo",
      INVITAR: "Invito a un usuario",
      EXPULSAR: "Expulso a un miembro",
      SALIR: "Salio del grupo",
      ELIMINAR: "Elimino el grupo",
    };
    return acciones[accion] || accion;
  }

  formatearFechaHora(fecha: string): string {
    const f = this.parsearFechaUtc(fecha);
    if (!f) return "";
    return f.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatearRelativo(fecha: string): string {
    const f = this.parsearFechaUtc(fecha);
    if (!f) return "";
    const min = Math.floor((Date.now() - f.getTime()) / 60000);
    if (min < 1) return "Ahora";
    if (min < 60) return `Hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Hace ${h} h`;
    const d = Math.floor(h / 24);
    return d < 7 ? `Hace ${d} d` : this.formatearFechaHora(fecha);
  }

  private parsearFechaUtc(fecha: string | Date | null | undefined): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;
    const s = String(fecha);
    const tieneZona = /Z$|[+-]\d{2}:?\d{2}$/.test(s);
    return new Date(tieneZona ? s : s + "Z");
  }

  getEstadoMiembro(m: MiembroGrupo): string {
    if (m.enLinea) return "En linea";
    const fecha = this.parsearFechaUtc(m.ultimaConexion);
    if (!fecha) return "Desconectado";
    const diffMs = Date.now() - fecha.getTime();
    if (diffMs < 0) return "Ult. vez hace unos segundos";
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return "Ult. vez hace unos segundos";
    if (min < 60) return `Ult. vez hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Ult. vez hace ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `Ult. vez hace ${d} d`;
    return `Ult. vez ${fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}`;
  }

  // ===== OVERLAY =====
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