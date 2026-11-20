// src/app/features/community/create-post/create-post.component.ts
import { Component, signal, OnInit, OnDestroy, inject, isDevMode } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { ImageSanitizerService } from '../../../core/services/image-sanitizer.service';
import { ImagenCompresionService } from '../../../core/services/imagen-compresion.service';
import { CommonModule } from '@angular/common';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import { safeClassToken, isSafeExternalUrl } from '../../../shared/utils/url-sanitizer';

/** Motivos de sensibilidad aceptados por el backend. */
export type MotivoSensibilidad = 'nsfw' | 'violencia' | 'spoiler' | 'sangre' | 'otro';

/** Opciones para el <select> del template. */
export const MOTIVOS_SENSIBILIDAD: { valor: MotivoSensibilidad; etiqueta: string }[] = [
  { valor: 'nsfw',      etiqueta: 'NSFW (contenido adulto)' },
  { valor: 'violencia', etiqueta: 'Violencia' },
  { valor: 'spoiler',   etiqueta: 'Spoiler' },
  { valor: 'sangre',    etiqueta: 'Sangre / gore' },
  { valor: 'otro',      etiqueta: 'Otro' },
];

/** Valida que un control de link sea http(s) o vacio. */
function linkValidator(control: AbstractControl): { [key: string]: any } | null {
  const valor = (control.value || '').toString().trim();
  if (!valor) return null;
  if (!isSafeExternalUrl(valor)) return { linkInvalido: true };
  if (valor.length > 2048)       return { linkLargo: true };
  return null;
}

/** Rechaza caracteres de control y HTML basico en texto plano. */
function plainTextValidator(maxLen: number) {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const valor = (control.value || '').toString();
    if (valor.length > maxLen) return { tooLong: true };
    if (/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(valor)) {
      return { caracteresInvalidos: true };
    }
    return null;
  };
}

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, AvisoLoginComponent],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private imageSanitizer = inject(ImageSanitizerService);
  private imagenCompresion = inject(ImagenCompresionService);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  // ===== LIMITES =====
  private readonly MAX_ARCHIVOS = 10;
  private readonly MAX_TOTAL_BYTES = 100 * 1024 * 1024;
  private readonly MAX_IMAGE_SIZE = 15 * 1024 * 1024;
  private readonly MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  private readonly MAX_GIF_SIZE = 15 * 1024 * 1024;
  private readonly MAX_DOC_SIZE = 15 * 1024 * 1024;

  // ===== ESTADO =====
  publicando = signal(false);
  errorMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  estaLogueado = signal<boolean>(false);
  mostrarAvisoLogin = signal(false);
  esAnonimo = signal(false);
  comprimiendo = signal(false);

  // ✅ SENSIBILIDAD
  esSensible = signal(false);
  motivoSensibilidad = signal<MotivoSensibilidad>('otro');
  readonly motivosSensibilidad = MOTIVOS_SENSIBILIDAD;

  // ===== FORM =====
  form = this.fb.group({
    categoria: ['', [
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z0-9\s\-_]+$/),
    ]],
    titulo: ['', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(120),
      plainTextValidator(120),
    ]],
    descripcion: ['', [
      Validators.required,
      Validators.minLength(20),
      Validators.maxLength(5000),
      plainTextValidator(5000),
    ]],
    link: ['', [linkValidator]],
  });

  get temaClaseSeguro(): string {
    return safeClassToken(this.personalizacionStore.temaId(), 'default');
  }

  ngOnInit(): void {
    const logueado = this.authService.estaLogueado();
    this.estaLogueado.set(logueado);
    if (!logueado) this.mostrarAvisoLogin.set(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  get categoria() { return this.form.controls.categoria; }
  get titulo() { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }
  get link() { return this.form.controls.link; }

  // ===== SENSIBILIDAD =====
  /** Cambia el flag. Si se desactiva, resetea el motivo a "otro". */
  toggleSensible(valor: boolean): void {
    this.esSensible.set(valor);
    if (!valor) this.motivoSensibilidad.set('otro');
  }

  /** Cambia el motivo seleccionado. */
  cambiarMotivoSensibilidad(valor: string): void {
    const motivo = valor as MotivoSensibilidad;
    if (MOTIVOS_SENSIBILIDAD.some(m => m.valor === motivo)) {
      this.motivoSensibilidad.set(motivo);
    }
  }

  // ===== ARCHIVOS =====
  getTipoArchivo(archivo: File): string {
    if (archivo.type.startsWith('video/')) return 'Video';
    if (archivo.type === 'image/gif')      return 'GIF';
    if (archivo.type.startsWith('image/')) return 'Imagen';
    return 'Documento';
  }

  async onArchivosSeleccionados(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement | null;
    if (!input) return;

    if (!this.estaLogueado()) {
      this.mostrarAvisoLogin.set(true);
      input.value = '';
      return;
    }

    if (!input.files) { input.value = ''; return; }

    const archivos = Array.from(input.files);
    const actuales = this.archivosSeleccionados();

    if (actuales.length + archivos.length > this.MAX_ARCHIVOS) {
      this.errorMsg.set(`Maximo ${this.MAX_ARCHIVOS} archivos por publicacion`);
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      input.value = '';
      return;
    }

    const validos: File[] = [];
    for (const archivo of archivos) {
      const esVideo  = archivo.type.startsWith('video/');
      const esGif    = archivo.type === 'image/gif';
      const esImagen = archivo.type.startsWith('image/');

      let maxSize = this.MAX_DOC_SIZE;
      let tipo = 'documento';
      if (esVideo)       { maxSize = this.MAX_VIDEO_SIZE; tipo = 'video'; }
      else if (esGif)    { maxSize = this.MAX_GIF_SIZE;   tipo = 'GIF'; }
      else if (esImagen) { maxSize = this.MAX_IMAGE_SIZE; tipo = 'imagen'; }

      if (archivo.size > maxSize) {
        const limiteStr = tipo === 'video' ? '50MB' : '15MB';
        this.errorMsg.set(`${archivo.name} excede el limite de ${limiteStr}`);
        this.safeTimeout(() => this.errorMsg.set(null), 4000);
        continue;
      }
      if (!archivo.name || archivo.name.length > 255) {
        this.errorMsg.set('Nombre de archivo invalido');
        this.safeTimeout(() => this.errorMsg.set(null), 4000);
        continue;
      }
      validos.push(archivo);
    }

    const totalBytes = [...actuales, ...validos].reduce((acc, f) => acc + f.size, 0);
    if (totalBytes > this.MAX_TOTAL_BYTES) {
      this.errorMsg.set('El total de archivos supera el limite de 100MB');
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      input.value = '';
      return;
    }

    if (validos.length > 0) {
      this.comprimiendo.set(true);
      try {
        const procesados = await this.procesarArchivos(validos);
        const limpios = await this.imageSanitizer.limpiarArchivos(procesados);
        this.archivosSeleccionados.set([...actuales, ...limpios]);
      } catch (error) {
        if (isDevMode()) console.error('Error al procesar archivos:', error);
        try {
          const limpios = await this.imageSanitizer.limpiarArchivos(validos);
          this.archivosSeleccionados.set([...actuales, ...limpios]);
        } catch {
          this.archivosSeleccionados.set([...actuales, ...validos]);
        }
      } finally {
        this.comprimiendo.set(false);
      }
    }

    input.value = '';
  }

  private async procesarArchivos(archivos: File[]): Promise<File[]> {
    const resultados: File[] = [];
    for (const archivo of archivos) {
      if (archivo.type.startsWith('image/') && archivo.type !== 'image/gif') {
        try {
          resultados.push(await this.imagenCompresion.comprimir(archivo));
        } catch (error) {
          if (isDevMode()) console.warn('No se pudo comprimir:', archivo.name, error);
          resultados.push(archivo);
        }
      } else {
        resultados.push(archivo);
      }
    }
    return resultados;
  }

  quitarArchivo(index: number): void {
    this.archivosSeleccionados.update((lista) => lista.filter((_, i) => i !== index));
  }

  // ===== PUBLICAR =====
  publicar(): void {
    if (!this.estaLogueado()) {
      this.mostrarAvisoLogin.set(true);
      return;
    }

    if (this.comprimiendo()) {
      this.errorMsg.set('Espera a que los archivos terminen de procesarse');
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      if (this.categoria.invalid) {
        this.errorMsg.set('La categoria es obligatoria (2-50 caracteres, sin caracteres especiales)');
      } else if (this.titulo.invalid) {
        this.errorMsg.set('El titulo debe tener entre 6 y 120 caracteres, sin < >');
      } else if (this.descripcion.invalid) {
        this.errorMsg.set('La descripcion debe tener entre 20 y 5000 caracteres, sin < >');
      } else if (this.link.invalid) {
        this.errorMsg.set('El enlace debe ser una URL http(s) valida');
      } else {
        this.errorMsg.set('Completa todos los campos obligatorios');
      }
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }

    this.publicando.set(true);
    this.errorMsg.set(null);

    const datos = this.form.getRawValue();
    const titulo = (datos.titulo || '').trim();
    const categoria = (datos.categoria || '').trim();
    const descripcion = (datos.descripcion || '').trim();
    const link = (datos.link || '').trim();

    if (titulo.length < 6 || titulo.length > 120) {
      this.errorMsg.set('El titulo debe tener entre 6 y 120 caracteres');
      this.publicando.set(false);
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }
    if (descripcion.length < 20 || descripcion.length > 5000) {
      this.errorMsg.set('La descripcion debe tener entre 20 y 5000 caracteres');
      this.publicando.set(false);
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }
    if (link && !isSafeExternalUrl(link)) {
      this.errorMsg.set('El enlace debe ser una URL http(s) valida');
      this.publicando.set(false);
      this.safeTimeout(() => this.errorMsg.set(null), 4000);
      return;
    }

    // ============================================================
    // FORMDATA
    // ============================================================
    const formData = new FormData();
    formData.append('titulo', titulo);
    formData.append('categoria', categoria);
    formData.append('descripcion', descripcion);
    formData.append('esAnonimo', String(this.esAnonimo()));

    // ✅ SENSIBILIDAD
    const sensible = this.esSensible();
    formData.append('esSensible', String(sensible));
    if (sensible) {
      formData.append('motivoSensibilidad', this.motivoSensibilidad());
    }

    if (link) formData.append('link', link);

    this.archivosSeleccionados().forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    this.postService.crear(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (nuevoPost) => {
          this.publicando.set(false);
          this.archivosSeleccionados.set([]);
          this.form.reset();
          this.esAnonimo.set(false);
          this.esSensible.set(false);
          this.motivoSensibilidad.set('otro');

          const id = nuevoPost?.id;
          if (id != null && Number.isFinite(Number(id)) && Number.isInteger(Number(id)) && Number(id) > 0) {
            this.router.navigate(['/comunidad', id]);
          } else {
            if (isDevMode()) console.warn('Post creado sin id valido, volviendo al feed');
            this.router.navigate(['/comunidad']);
          }
        },
        error: (error) => {
          if (isDevMode()) console.error('Error al publicar:', error);

          let mensaje = 'No se pudo publicar. Intenta nuevamente.';
          if (error?.error) {
            if (typeof error.error === 'string') {
              mensaje = error.error;
            } else if (error.error.mensaje) {
              mensaje = String(error.error.mensaje);
            } else if (error.error.message) {
              mensaje = String(error.error.message);
            } else if (error.error.errors) {
              mensaje = `Error de validacion: ${Object.values(error.error.errors).join(', ')}`;
            }
          }
          if (mensaje.length > 300) mensaje = mensaje.slice(0, 300) + '...';

          this.errorMsg.set(mensaje);
          this.publicando.set(false);
          this.safeTimeout(() => this.errorMsg.set(null), 5000);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/comunidad']);
  }

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