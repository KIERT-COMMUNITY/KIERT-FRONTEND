// src/app/shared/components/sticker-picker/sticker-picker.component.ts
import {
  Component, EventEmitter, Output, Input, inject, signal, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StickerService } from '../../../core/services/sticker.service';
import { Sticker } from '../../../core/models/sticker.model';

@Component({
  selector: 'kiert-sticker-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sticker-picker.component.html',
  styleUrl: './sticker-picker.component.scss'
})
export class StickerPickerComponent implements OnInit {
  private stickerService = inject(StickerService);

  @Input() visible = signal(false);
  @Output() stickerSeleccionado = new EventEmitter<Sticker>();
  @Output() cerrar = new EventEmitter<void>();
  @Output() abrirCrearSticker = new EventEmitter<void>();

  tabActivo = signal<'mios' | 'publicos'>('mios');
  busqueda = signal('');

  get stickersMostrados(): Sticker[] {
    const lista = this.tabActivo() === 'mios'
      ? this.stickerService.misStickers()
      : this.stickerService.stickersPublicos();

    const q = this.busqueda().toLowerCase().trim();
    if (!q) return lista;
    return lista.filter(s => s.nombre.toLowerCase().includes(q));
  }

  ngOnInit(): void {
    this.stickerService.asegurarCargados();
    this.stickerService.listarStickersPublicos().subscribe({ error: () => {} });
  }

  seleccionar(sticker: Sticker): void {
    this.stickerSeleccionado.emit(sticker);
  }

  cambiarTab(tab: 'mios' | 'publicos'): void {
    this.tabActivo.set(tab);
  }

  onBusquedaChange(valor: string): void {
    this.busqueda.set(valor);
  }

  abrirCrear(): void {
    this.abrirCrearSticker.emit();
  }

  cerrarPanel(): void {
    this.cerrar.emit();
  }
}