// src/app/features/community/create-post/create-post.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { ImageSanitizerService } from '../../../core/services/image-sanitizer.service';
import { CommonModule } from '@angular/common';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component'; // ✅

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AvisoLoginComponent], // ✅
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent implements OnInit {
  // ✅ 1) injects primero
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private imageSanitizer = inject(ImageSanitizerService);
  public personalizacionStore = inject(PersonalizacionStore);

  // 2) signals
  publicando = signal(false);
  errorMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  estaLogueado = signal<boolean>(false);
  mostrarAvisoLogin = signal(false); // ✅ NUEVO

  // 3) form (ya puede usar this.fb)
  form = this.fb.group({
    categoria: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    titulo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    link: [''],
  });

  ngOnInit(): void {
    const logueado = this.authService.estaLogueado();
    this.estaLogueado.set(logueado);

    if (!logueado) {
      // ✅ Mostramos el aviso inmediatamente al invitado
      this.mostrarAvisoLogin.set(true);
    }
  }

  get categoria() { return this.form.controls.categoria; }
  get titulo() { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  getTipoArchivo(archivo: File): string {
    if (archivo.type.startsWith('video/')) return 'Video';
    if (archivo.type === 'image/gif') return 'GIF';
    if (archivo.type.startsWith('image/')) return 'Imagen';
    return 'Documento';
  }

  async onArchivosSeleccionados(evento: Event): Promise<void> {
    // ✅ Bloqueo si no está logueado
    if (!this.estaLogueado()) {
      this.mostrarAvisoLogin.set(true);
      return;
    }

    const input = evento.target as HTMLInputElement;
    if (!input.files) return;

    const archivos = Array.from(input.files);
    const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
    const MAX_GIF_SIZE = 15 * 1024 * 1024;

    const validos: File[] = [];

    for (const archivo of archivos) {
      const esVideo = archivo.type.startsWith('video/');
      const esGif = archivo.type === 'image/gif';

      let maxSize = MAX_IMAGE_SIZE;
      let tipo = 'imagen';

      if (esVideo) {
        maxSize = MAX_VIDEO_SIZE;
        tipo = 'video';
      } else if (esGif) {
        maxSize = MAX_GIF_SIZE;
        tipo = 'GIF';
      }

      if (archivo.size > maxSize) {
        this.errorMsg.set(`${archivo.name} excede el límite de ${tipo === 'video' ? '50MB' : '15MB'}`);
        setTimeout(() => this.errorMsg.set(null), 3000);
        continue;
      }

      validos.push(archivo);
    }

    if (validos.length > 0) {
      try {
        const limpios = await this.imageSanitizer.limpiarArchivos(validos);
        this.archivosSeleccionados.set(limpios);
      } catch (error) {
        console.error('Error al limpiar metadatos:', error);
        this.archivosSeleccionados.set(validos);
      }
    }

    input.value = '';
  }

  quitarArchivo(nombre: string): void {
    this.archivosSeleccionados.update((lista) => lista.filter((f) => f.name !== nombre));
  }

  publicar(): void {
    // ✅ Bloqueo de invitado ANTES de cualquier otra cosa
    if (!this.estaLogueado()) {
      this.mostrarAvisoLogin.set(true);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (this.categoria.invalid) {
        this.errorMsg.set('La categoría es obligatoria (mínimo 2 caracteres)');
      } else if (this.titulo.invalid) {
        this.errorMsg.set('El título debe tener entre 6 y 120 caracteres');
      } else if (this.descripcion.invalid) {
        this.errorMsg.set('La descripción debe tener al menos 20 caracteres');
      } else {
        this.errorMsg.set('Completa todos los campos obligatorios');
      }

      setTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }

    this.publicando.set(true);
    this.errorMsg.set(null);

    const datos = this.form.getRawValue();
    const categoriaOriginal = datos.categoria?.trim() || '';

    const formData = new FormData();
    formData.append('titulo', datos.titulo?.trim() || '');
    formData.append('categoria', categoriaOriginal);
    formData.append('descripcion', datos.descripcion?.trim() || '');

    if (datos.link && datos.link.trim()) {
      formData.append('link', datos.link.trim());
    }

    const archivos = this.archivosSeleccionados();
    archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => {
        this.publicando.set(false);
        this.archivosSeleccionados.set([]);
        this.form.reset();
        if (nuevoPost && nuevoPost.id) {
          this.router.navigate(['/comunidad', nuevoPost.id]);
        } else {
          this.router.navigate(['/comunidad']);
        }
      },
      error: (error) => {
        console.error('Error al publicar:', error);

        let mensaje = 'No se pudo publicar. Intenta nuevamente.';

        if (error.error) {
          if (typeof error.error === 'string') mensaje = error.error;
          else if (error.error.mensaje) mensaje = error.error.mensaje;
          else if (error.error.message) mensaje = error.error.message;
          else if (error.error.errors) {
            const errores = Object.values(error.error.errors).join(', ');
            mensaje = `Error de validación: ${errores}`;
          }
        }

        this.errorMsg.set(mensaje);
        this.publicando.set(false);

        setTimeout(() => {
          if (this.errorMsg()) this.errorMsg.set(null);
        }, 5000);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/comunidad']);
  }

  /** ✅ Ir al login con returnUrl */
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/comunidad/nueva-publicacion' }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }
}