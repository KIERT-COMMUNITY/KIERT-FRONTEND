// src/app/features/admin/admin-bienvenida/admin-bienvenida.component.ts
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminBienvenidaService,
  HistorialBienvenida
} from '../../../core/services/admin-bienvenida.service';

@Component({
  selector: 'kiert-admin-bienvenida',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-bienvenida.component.html',
  styleUrl: './admin-bienvenida.component.scss'
})
export class AdminBienvenidaComponent implements OnInit {
  private service = inject(AdminBienvenidaService);
  private fb = inject(FormBuilder);

  // ============ ESTADO DEL FORMULARIO ============
  cargando = signal(true);
  guardando = signal(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);
  fechaActualizacion = signal<string | null>(null);
  actualizadoPorNombre = signal<string | null>(null);

  // ============ HISTORIAL ============
  historial = signal<HistorialBienvenida[]>([]);
  cargandoHistorial = signal(false);
  mostrarHistorial = signal(false);

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    contenido: ['', [Validators.required, Validators.maxLength(5000)]]
  });

  // ✅ Vista previa 100% reactiva con computed() sobre el formulario
  previewTitulo = computed(() => this.form.controls.titulo.value || '(sin titulo)');
  previewContenido = computed(() => this.form.controls.contenido.value || '(sin contenido)');

  // Textos por defecto SIN emojis ni tildes
  private readonly TITULO_DEFECTO = 'Bienvenido a Kiert Community';
  private readonly CONTENIDO_DEFECTO =
    'Este es tu espacio para conectar con otras personas: chatea en privado, crea grupos y comparte con la comunidad.\n\n' +
    'Si eres nuevo, explora los usuarios disponibles, envia solicitudes y empieza a conversar.\n' +
    'Si ya tienes cuenta, continua donde lo dejaste.\n\n' +
    'Recuerda ser respetuoso y seguir las normas de la comunidad. Disfruta!';

  ngOnInit(): void {
    this.cargar();
  }

  // ============================================================
  // CARGAR CONFIGURACIÓN
  // ============================================================
  private cargar(): void {
    this.cargando.set(true);
    this.service.obtener().subscribe({
      next: (data) => {
        this.form.patchValue({
          titulo: this.limpiarEmojis(data.titulo),
          contenido: this.limpiarEmojis(data.contenido)
        });
        this.fechaActualizacion.set(data.fechaActualizacion);
        this.actualizadoPorNombre.set(data.actualizadoPorNombre ?? null);
        this.cargando.set(false);
      },
      error: () => {
        this.mensajeError.set('No se pudo cargar la configuracion');
        this.cargando.set(false);
      }
    });
  }

  // ============================================================
  // GUARDAR
  // ============================================================
  guardar(): void {
    if (this.form.invalid) return;

    this.guardando.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    const { titulo, contenido } = this.form.getRawValue();
    this.service.actualizar(titulo, contenido).subscribe({
      next: (data) => {
        this.fechaActualizacion.set(data.fechaActualizacion);
        this.actualizadoPorNombre.set(data.actualizadoPorNombre ?? null);
        this.guardando.set(false);
        this.mensajeExito.set('Bienvenida actualizada correctamente');
        setTimeout(() => this.mensajeExito.set(null), 4000);

        // Refrescar historial si está abierto
        if (this.mostrarHistorial()) this.cargarHistorial();
      },
      error: (err) => {
        this.guardando.set(false);
        this.mensajeError.set(err?.error?.mensaje || err?.error?.error || 'Error al guardar');
        setTimeout(() => this.mensajeError.set(null), 5000);
      }
    });
  }

  // ============================================================
  // RESTAURAR
  // ============================================================
  restaurar(): void {
    this.form.patchValue({
      titulo: this.TITULO_DEFECTO,
      contenido: this.CONTENIDO_DEFECTO
    });
  }

  // ============================================================
  // HISTORIAL
  // ============================================================
  toggleHistorial(): void {
    const abrir = !this.mostrarHistorial();
    this.mostrarHistorial.set(abrir);
    if (abrir && this.historial().length === 0) {
      this.cargarHistorial();
    }
  }

  private cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.service.listarHistorial(0, 20).subscribe({
      next: (data) => {
        this.historial.set(data);
        this.cargandoHistorial.set(false);
      },
      error: () => {
        this.historial.set([]);
        this.cargandoHistorial.set(false);
      }
    });
  }

  // ============================================================
  // UTILIDADES
  // ============================================================
  private limpiarEmojis(texto: string | null | undefined): string {
    if (!texto) return '';
    return texto
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}]/gu,
        ''
      )
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  trackByHistorialId(_index: number, item: HistorialBienvenida): number {
    return item.id;
  }
}