// src/app/shared/components/sticker-picker/sticker-picker.component.ts
import {
  Component, EventEmitter, Output, inject, signal, OnInit, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StickerService } from '../../../core/services/sticker.service';
import { Sticker } from '../../../core/models/sticker.model';

@Component({
  selector: 'kiert-sticker-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sticker-picker.component.html',
  styleUrl: './sticker-picker.component.scss'
})
export class StickerPickerComponent implements OnInit {
  private stickerService = inject(StickerService);

  @Output() stickerSeleccionado = new EventEmitter<Sticker>();
  @Output() cerrar = new EventEmitter<void>();
  @Output() abrirCrearSticker = new EventEmitter<void>();

  // ===== TABS =====
  tabActivo = signal<'mios' | 'publicos'>('mios');
  busqueda = signal('');

  // ===== MODAL CREAR STICKER =====
  mostrarModalCrear = signal(false);
  nombreSticker = signal('');
  esPublico = signal(false);
  archivoSeleccionado = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  guardando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // ===== ✅ ELIMINAR STICKER =====
  mostrarConfirmEliminar = signal(false);
  stickerAEliminar = signal<Sticker | null>(null);
  eliminando = signal(false);

  // ===== LISTA FILTRADA =====
  stickersMostrados = computed<Sticker[]>(() => {
    const lista = this.tabActivo() === 'mios'
      ? this.stickerService.misStickers()
      : this.stickerService.stickersPublicos();

    const q = this.busqueda().toLowerCase().trim();
    if (!q) return lista;
    return lista.filter(s => s.nombre.toLowerCase().includes(q));
  });

  get nombreValido(): boolean {
    return this.nombreSticker().trim().length > 0;
  }

  get puedeCrear(): boolean {
    return this.nombreValido
        && this.archivoSeleccionado() !== null
        && !this.guardando();
  }

  // ============================================================
  // CICLO DE VIDA
  // ============================================================
  ngOnInit(): void {
    this.stickerService.asegurarCargados();
    this.stickerService.listarStickersPublicos().subscribe({ error: () => {} });
  }

  // ============================================================
  // ACCIONES DEL PICKER
  // ============================================================
  seleccionar(sticker: Sticker): void {
    this.stickerSeleccionado.emit(sticker);
  }

  cambiarTab(tab: 'mios' | 'publicos'): void {
    this.tabActivo.set(tab);

    // Si cambia a "públicos", recargar desde el backend
    if (tab === 'publicos') {
      this.stickerService.listarStickersPublicos().subscribe({ error: () => {} });
    }
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }

  // ============================================================
  // MODAL CREAR STICKER
  // ============================================================
  abrirCrear(): void {
    this.mostrarModalCrear.set(true);
    this.nombreSticker.set('');
    this.esPublico.set(false);
    this.archivoSeleccionado.set(null);
    this.previewUrl.set(null);
    this.errorMsg.set(null);
    this.exitoMsg.set(null);

    this.abrirCrearSticker.emit();
  }

  cerrarModalCrear(): void {
    if (this.guardando()) return;
    this.mostrarModalCrear.set(false);
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (file.size > 1024 * 1024) {
      this.errorMsg.set('La imagen no debe superar 1 MB');
      setTimeout(() => this.errorMsg.set(null), 4000);
      input.value = '';
      return;
    }

    const tiposValidos = ['image/webp', 'image/png', 'image/gif', 'image/jpeg'];
    if (!tiposValidos.includes(file.type)) {
      this.errorMsg.set('Formato no válido. Usa WEBP, PNG, GIF o JPG.');
      setTimeout(() => this.errorMsg.set(null), 4000);
      input.value = '';
      return;
    }

    this.archivoSeleccionado.set(file);

    const reader = new FileReader();
    reader.onload = () => this.previewUrl.set(reader.result as string);
    reader.readAsDataURL(file);

    input.value = '';
  }

  quitarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.previewUrl.set(null);
  }

  crearSticker(): void {
    const nombre = this.nombreSticker().trim();
    const archivo = this.archivoSeleccionado();

    if (!nombre) {
      this.errorMsg.set('Escribe un nombre para el sticker');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    if (!archivo) {
      this.errorMsg.set('Selecciona una imagen');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    this.stickerService.crearSticker(nombre, this.esPublico(), archivo).subscribe({
      next: (sticker) => {
        this.guardando.set(false);
        this.exitoMsg.set(`Sticker "${sticker.nombre}" creado correctamente`);

        // Si es público, forzar recarga de públicos
        if (sticker.esPublico) {
          this.stickerService.listarStickersPublicos().subscribe({ error: () => {} });
        }

        this.tabActivo.set('mios');

        setTimeout(() => {
          this.mostrarModalCrear.set(false);
          this.exitoMsg.set(null);
        }, 1200);
      },
      error: (err) => {
        this.guardando.set(false);
        const mensaje = err?.error?.error || err?.error?.mensaje || 'Error al crear sticker';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 5000);
      }
    });
  }

  // ============================================================
  // ✅ ELIMINAR STICKER
  // ============================================================
  abrirConfirmEliminar(sticker: Sticker, event: MouseEvent): void {
    event.stopPropagation();
    this.stickerAEliminar.set(sticker);
    this.mostrarConfirmEliminar.set(true);
  }

  cerrarConfirmEliminar(): void {
    if (this.eliminando()) return;
    this.mostrarConfirmEliminar.set(false);
    this.stickerAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const sticker = this.stickerAEliminar();
    if (!sticker) return;

    this.eliminando.set(true);

    this.stickerService.eliminarSticker(sticker.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.stickerAEliminar.set(null);
        this.exitoMsg.set(`Sticker "${sticker.nombre}" eliminado`);
        setTimeout(() => this.exitoMsg.set(null), 2000);
      },
      error: (err) => {
        this.eliminando.set(false);
        this.mostrarConfirmEliminar.set(false);
        const mensaje = err?.error?.error || err?.error?.mensaje || 'Error al eliminar sticker';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 5000);
      }
    });
  }
}