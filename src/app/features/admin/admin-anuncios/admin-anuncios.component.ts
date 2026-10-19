import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';

@Component({
  selector: 'kiert-admin-anuncios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-anuncios.component.html',
  styleUrl: './admin-anuncios.component.scss'
})
export class AdminAnunciosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private anuncioService = inject(AnuncioService);

  anuncios = signal<Anuncio[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  editandoId = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  archivoSeleccionado = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    texto: ['', [Validators.required]],
    enlaceUrl: ['']
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.anuncioService.listarTodos().subscribe({
      next: (data) => {
        this.anuncios.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.errorMsg.set('No se pudieron cargar los anuncios');
      }
    });
  }

  onArchivoChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoSeleccionado.set(file);

    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      this.previewUrl.set(null);
    }
  }

  limpiarFormulario(): void {
    this.form.reset();
    this.editandoId.set(null);
    this.archivoSeleccionado.set(null);
    this.previewUrl.set(null);
    this.errorMsg.set(null);
  }

  editar(a: Anuncio): void {
    this.editandoId.set(a.id!);
    this.form.patchValue({
      titulo: a.titulo,
      texto: a.texto,
      enlaceUrl: a.enlaceUrl ?? ''
    });
    this.previewUrl.set(a.imagenUrl ?? null);
    this.archivoSeleccionado.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const { titulo, texto, enlaceUrl } = this.form.getRawValue();
    const fd = new FormData();
    fd.append('titulo', titulo!);
    fd.append('texto', texto!);
    if (enlaceUrl) fd.append('enlaceUrl', enlaceUrl);
    const file = this.archivoSeleccionado();
    if (file) fd.append('imagen', file);

    const id = this.editandoId();

    const op = id
      ? this.anuncioService.actualizar(id, fd)
      : this.anuncioService.crear(fd);

    op.subscribe({
      next: () => {
        this.guardando.set(false);
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(err.error?.error || 'No se pudo guardar');
      }
    });
  }

  eliminar(a: Anuncio): void {
    if (!a.id) return;
    if (!confirm(`¿Eliminar el anuncio "${a.titulo}"?`)) return;

    this.anuncioService.eliminar(a.id).subscribe({
      next: () => this.cargar(),
      error: () => this.errorMsg.set('No se pudo eliminar')
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }
}