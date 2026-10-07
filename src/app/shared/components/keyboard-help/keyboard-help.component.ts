// src/app/shared/components/keyboard-help/keyboard-help.component.ts
import { Component, inject, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService, AtajoTeclado } from '../../../core/services/keyboard-shortcuts.service';

@Component({
  selector: 'kiert-keyboard-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-help.component.html',
  styleUrl: './keyboard-help.component.scss'
})
export class KeyboardHelpComponent {
  shortcuts = inject(KeyboardShortcutsService);

  categorias = computed(() => {
    const grupos = new Map<string, AtajoTeclado[]>();
    this.shortcuts.atajosDisponibles.forEach(a => {
      if (!grupos.has(a.categoria)) grupos.set(a.categoria, []);
      grupos.get(a.categoria)!.push(a);
    });
    return Array.from(grupos.entries());
  });

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.shortcuts.mostrarAyuda()) {
      this.cerrar();
    }
  }

  cerrar(): void {
    this.shortcuts.mostrarAyuda.set(false);
  }

  formatearTecla(tecla: string): string {
    const mapa: Record<string, string> = {
      'Escape': 'Esc',
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Enter': 'Enter',
      'Tab': 'Tab'
    };
    return mapa[tecla] || tecla.toUpperCase();
  }
}