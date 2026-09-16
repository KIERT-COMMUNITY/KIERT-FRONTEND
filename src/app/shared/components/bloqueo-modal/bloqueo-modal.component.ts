// src/app/shared/components/bloqueo-modal/bloqueo-modal.component.ts
import { Component, EventEmitter, Input, Output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BloqueoService } from '../../../core/services/bloqueo.service';

@Component({
  selector: 'kiert-bloqueo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bloqueo-modal.component.html',
  styleUrl: './bloqueo-modal.component.scss',
})
export class BloqueoModalComponent {
  private bloqueoService = inject(BloqueoService);

  // ===== INPUTS / OUTPUTS =====
  @Input() usuarioId!: number;
  @Input() usuarioNombre!: string;
  @Output() cerrar = new EventEmitter<void>();
  @Output() bloqueado = new EventEmitter<void>();

  // ===== SIGNALS =====
  motivo = signal<string>('');
  enviando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  // 🔥 AQUÍ ESTÁ LA CLAVE: nombre correcto
  motivosRapidos: string[] = [
    'Acoso o ciberacoso',
    'Spam o publicidad',
    'Comportamiento ofensivo',
    'Contenido inapropiado',
    'Suplantación de identidad',
    'Otro'
  ];

  // ===== MÉTODOS =====
  seleccionarMotivo(m: string): void {
    if (this.motivo() === m) {
      this.motivo.set('');
    } else {
      this.motivo.set(m);
    }
    this.errorMsg.set(null);
  }

  /**
   * 🔥 Método llamado por el HTML — `confirmar()`
   */
  confirmar(): void {
    if (!this.usuarioId) {
      this.errorMsg.set('ID de usuario inválido');
      return;
    }

    const motivoFinal = this.motivo().trim();
    if (!motivoFinal) {
      this.errorMsg.set('Debes indicar un motivo');
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set(null);

    this.bloqueoService.bloquear(this.usuarioId, motivoFinal).subscribe({
      next: () => {
        this.enviando.set(false);
        this.bloqueado.emit();
        this.cerrar.emit();
      },
      error: (err) => {
        this.enviando.set(false);
        const mensaje = err?.error?.error
          || err?.error?.mensaje
          || 'Error al bloquear usuario';
        this.errorMsg.set(mensaje);
      }
    });
  }
}