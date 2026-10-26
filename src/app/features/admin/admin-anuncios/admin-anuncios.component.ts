// src/app/features/admin/admin-anuncios/admin-anuncios.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Anuncio, AnuncioService } from '../../../core/services/anuncio.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

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
    enlaceUrl: [''],
    esFlotante: [false] // ✅ NUEVO CONTROL
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
    this.form.reset({ esFlotante: false });
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
      enlaceUrl: a.enlaceUrl ?? '',
      esFlotante: a.esFlotante ?? false // ✅ Cargar valor
    });
    this.previewUrl.set(a.imagenUrl ?? null);
    this.archivoSeleccionado.set(null);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Completa todos los campos obligatorios');
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const { titulo, texto, enlaceUrl, esFlotante } = this.form.getRawValue();

    const fd = new FormData();
    fd.append('titulo', titulo!.trim());
    fd.append('texto', texto!.trim());
    if (enlaceUrl?.trim()) {
      fd.append('enlaceUrl', enlaceUrl.trim());
    }
    fd.append('esFlotante', String(esFlotante)); // ✅ Enviar al backend

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

        if (err.status === 400) mensaje = err.error?.message || 'Datos inválidos.';
        else if (err.status === 401) { mensaje = 'Sesión expirada.'; this.adminAuth.logoutYNavegar(); }
        else if (err.status === 403) mensaje = 'No tienes permiso.';
        else if (err.status === 413) mensaje = 'Archivo demasiado grande (máx. 10MB).';
        else if (err.status === 415) mensaje = 'Tipo de archivo no permitido.';

        this.errorMsg.set(mensaje);
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