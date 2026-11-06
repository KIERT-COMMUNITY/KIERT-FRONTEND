// src/app/features/admin/admin-anuncios/admin-anuncios.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { ImagenCompresionService } from '../../../core/services/imagen-compresion.service';
import { isSafeExternalUrl } from '../../../shared/utils/url-sanitizer';

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
  private adminAuth = inject(AdminAuthService);
  private router = inject(Router);
  private imagenCompresion = inject(ImagenCompresionService);

  anuncios = signal<Anuncio[]>([]);
  cargando = signal(true);
  guardando = signal(false);
  comprimiendo = signal(false);
  editandoId = signal<number | null>(null);
  errorMsg = signal<string | null>(null);
  archivoSeleccionado = signal<File | null>(null);
  previewUrl = signal<string | null>(null);

  mostrarConfirmEliminar = signal(false);
  anuncioAEliminar = signal<Anuncio | null>(null);
  eliminando = signal(false);

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    texto: ['', [Validators.required]],
    enlaceUrl: ['', [
      (control: AbstractControl): ValidationErrors | null => {
        const val = control.value;
        if (!val || val.trim() === '') return null;
        if (!isSafeExternalUrl(val)) return { linkInvalido: true };
        return null;
      }
    ]],
    esFlotante: [false],
    activo: [true]
  });

  ngOnInit(): void {
    if (!this.adminAuth.esAdminOMayor()) {
      this.router.navigate(['/comunidad']);
      return;
    }
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

  async onArchivoChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.archivoSeleccionado.set(null);
      this.previewUrl.set(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMsg.set('El archivo debe ser una imagen');
      input.value = '';
      return;
    }

    this.comprimiendo.set(true);
    this.errorMsg.set(null);

    try {
      const archivoComprimido = await this.imagenCompresion.comprimir(file);
      this.archivoSeleccionado.set(archivoComprimido);

      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(archivoComprimido);

    } catch (error) {
      console.error('Error al comprimir imagen:', error);
      this.errorMsg.set('Error al procesar la imagen');
      input.value = '';
    } finally {
      this.comprimiendo.set(false);
    }
  }

  limpiarFormulario(): void {
    this.form.reset({ esFlotante: false, activo: true });
    this.editandoId.set(null);
    this.archivoSeleccionado.set(null);
    this.previewUrl.set(null);
    this.errorMsg.set(null);
    this.comprimiendo.set(false);
  }

  editar(a: Anuncio): void {
    this.editandoId.set(a.id!);
    this.form.patchValue({
      titulo: a.titulo,
      texto: a.texto,
      enlaceUrl: a.enlaceUrl ?? '',
      esFlotante: a.esFlotante ?? false,
      activo: a.activo ?? true
    });
    this.previewUrl.set(a.imagenUrl ?? null);
    this.archivoSeleccionado.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.controls.enlaceUrl.errors?.['linkInvalido']) {
        this.errorMsg.set('El enlace debe ser una URL valida (https://...)');
      } else {
        this.errorMsg.set('Completa todos los campos obligatorios');
      }
      return;
    }

    if (this.comprimiendo()) {
      this.errorMsg.set('Espera a que la imagen termine de procesarse');
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const { titulo, texto, enlaceUrl, esFlotante, activo } = this.form.getRawValue();

    const fd = new FormData();
    fd.append('titulo', titulo!.trim());
    fd.append('texto', texto!.trim());
    if (enlaceUrl?.trim()) {
      fd.append('enlaceUrl', enlaceUrl.trim());
    }
    fd.append('esFlotante', String(esFlotante));
    fd.append('activo', String(activo));

    const file = this.archivoSeleccionado();
    if (file) {
      fd.append('imagen', file);
    }

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
        let mensaje = 'No se pudo guardar';

        if (err.status === 400) mensaje = err.error?.message || 'Datos invalidos.';
        else if (err.status === 401) { mensaje = 'Sesion expirada.'; this.adminAuth.logoutYNavegar(); }
        else if (err.status === 403) mensaje = 'No tienes permiso.';
        else if (err.status === 413) mensaje = 'Archivo demasiado grande (max. 10MB).';
        else if (err.status === 415) mensaje = 'Tipo de archivo no permitido.';

        this.errorMsg.set(mensaje);
      }
    });
  }

  abrirConfirmEliminar(a: Anuncio): void {
    if (!a.id) return;
    this.anuncioAEliminar.set(a);
    this.mostrarConfirmEliminar.set(true);
  }

  cancelarEliminar(): void {
    if (this.eliminando()) return;
    this.mostrarConfirmEliminar.set(false);
    this.anuncioAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const a = this.anuncioAEliminar();
    if (!a || !a.id) return;

    this.eliminando.set(true);
    this.anuncioService.eliminar(a.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.anuncioAEliminar.set(null);
        this.cargar();
      },
      error: () => {
        this.eliminando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.anuncioAEliminar.set(null);
        this.errorMsg.set('No se pudo eliminar');
      }
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }
}