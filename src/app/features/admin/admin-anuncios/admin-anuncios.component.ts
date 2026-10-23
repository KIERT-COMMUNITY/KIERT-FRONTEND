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
    enlaceUrl: ['']
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
      error: (err) => {
        console.error('[ADMIN ANUNCIOS] Error cargar:', err);
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
      this.errorMsg.set('Completa todos los campos obligatorios');
      return;
    }

    this.guardando.set(true);
    this.errorMsg.set(null);

    const { titulo, texto, enlaceUrl } = this.form.getRawValue();
    
    // ✅ FORMDATA correctamente armado
    const fd = new FormData();
    fd.append('titulo', titulo!.trim());
    fd.append('texto', texto!.trim());
    if (enlaceUrl?.trim()) {
      fd.append('enlaceUrl', enlaceUrl.trim());
    }
    const file = this.archivoSeleccionado();
    if (file) {
      fd.append('imagen', file);
    }

    console.log('[ADMIN ANUNCIOS] Enviando FormData:', {
      titulo: titulo,
      texto: texto,
      enlaceUrl: enlaceUrl,
      tieneImagen: !!file,
      nombreArchivo: file?.name,
      tamanoArchivo: file?.size
    });

    const id = this.editandoId();

    const op = id
      ? this.anuncioService.actualizar(id, fd)
      : this.anuncioService.crear(fd);

    op.subscribe({
      next: (res) => {
        console.log('[ADMIN ANUNCIOS] ✅ Guardado OK:', res);
        this.guardando.set(false);
        this.limpiarFormulario();
        this.cargar();
      },
      error: (err) => {
        this.guardando.set(false);
        console.error('[ADMIN ANUNCIOS] ❌ Error:', err);
        console.error('[ADMIN ANUNCIOS] Status:', err.status);
        console.error('[ADMIN ANUNCIOS] Body del error:', err.error);
        console.error('[ADMIN ANUNCIOS] Headers enviados:', err.headers);

        // Diagnóstico del error
        let mensaje = 'No se pudo guardar';
        
        if (err.status === 400) {
          mensaje = err.error?.message 
            || err.error?.error 
            || 'Datos inválidos. Revisa todos los campos.';
        } else if (err.status === 401) {
          mensaje = 'Sesión expirada. Vuelve a iniciar sesión.';
          this.adminAuth.logoutYNavegar();
        } else if (err.status === 403) {
          mensaje = 'No tienes permiso para crear anuncios.';
        } else if (err.status === 413) {
          mensaje = 'El archivo es demasiado grande (máx. 10MB).';
        } else if (err.status === 415) {
          mensaje = 'Tipo de archivo no permitido. Usa JPG, PNG o WEBP.';
        }

        this.errorMsg.set(mensaje);
      }
    });
  }

  eliminar(a: Anuncio): void {
    if (!a.id) return;
    if (!confirm(`¿Eliminar el anuncio "${a.titulo}"?`)) return;

    this.anuncioService.eliminar(a.id).subscribe({
      next: () => this.cargar(),
      error: (err) => {
        console.error('[ADMIN ANUNCIOS] Error eliminar:', err);
        this.errorMsg.set('No se pudo eliminar');
      }
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }
}