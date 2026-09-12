import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BloqueoService } from '../../../core/services/bloqueo.service';

@Component({
  selector: 'kiert-bloqueo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bloqueo-modal.component.html',
  styleUrl: './bloqueo-modal.component.scss'
})
export class BloqueoModalComponent {
  private bloqueoService = inject(BloqueoService);

  @Input({ required: true }) usuarioId!: number;
  @Input({ required: true }) usuarioNombre!: string;
  @Output() cerrar = new EventEmitter<void>();
  @Output() bloqueado = new EventEmitter<void>();

  motivo = signal('');
  enviando = signal(false);
  errorMsg = signal<string | null>(null);

  motivosRapidos = [
    'Acoso o intimidación',
    'Spam o publicidad',
    'Contenido inapropiado',
    'Comportamiento ofensivo',
    'Ya no quiero ver su contenido'
  ];

  seleccionarMotivo(m: string): void {
    this.motivo.set(m);
  }

  confirmar(): void {
    if (!this.motivo().trim()) {
      this.errorMsg.set('Debes indicar un motivo');
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set(null);

    this.bloqueoService.bloquear({
      usuarioBloqueadoId: this.usuarioId,
      motivo: this.motivo().trim()
    }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.bloqueado.emit();
        this.cerrar.emit();
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorMsg.set(err.error?.error || 'Error al bloquear usuario');
      }
    });
  }
}