import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReporteService, CrearReporte } from '../../../core/services/reporte.service';

@Component({
  selector: 'kiert-reporte-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reporte-modal.component.html',
  styleUrl: './reporte-modal.component.scss'
})
export class ReporteModalComponent {
  private fb = inject(FormBuilder);
  private reporteService = inject(ReporteService);

  @Input({ required: true }) tipoReporte!: 'POST' | 'COMENTARIO' | 'RESPUESTA' | 'USUARIO';
  @Input() postId?: number;
  @Input() comentarioId?: number;
  @Input() respuestaId?: number;
  @Input() usuarioReportadoId?: number;
  @Output() cerrar = new EventEmitter<void>();

  enviando = signal(false);
  enviado = signal(false);
  errorMsg = signal<string | null>(null);

  motivos = [
    { valor: 'SPAM', label: 'Spam o publicidad no deseada' },
    { valor: 'ACOSO', label: 'Acoso o intimidación' },
    { valor: 'CONTENIDO_INAPROPIADO', label: 'Contenido inapropiado' },
    { valor: 'VIOLENCIA', label: 'Violencia o amenazas' },
    { valor: 'DERECHOS_AUTOR', label: 'Infracción de derechos de autor' },
    { valor: 'INFORMACION_FALSA', label: 'Información falsa' },
    { valor: 'OTRO', label: 'Otro motivo' },
  ];

  form = this.fb.group({
    motivo: ['', Validators.required],
    descripcion: ['', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(1000)
    ]]
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set(null);

    const data: CrearReporte = {
      tipoReporte: this.tipoReporte,
      motivo: this.form.value.motivo!,
      descripcion: this.form.value.descripcion!,
      postId: this.postId,
      comentarioId: this.comentarioId,
      respuestaId: this.respuestaId,
      usuarioReportadoId: this.usuarioReportadoId
    };

    this.reporteService.crearReporte(data).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorMsg.set(err.error?.error || 'Error al enviar el reporte');
      }
    });
  }
}