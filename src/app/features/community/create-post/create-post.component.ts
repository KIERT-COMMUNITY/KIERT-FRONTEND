import { Component, signal, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent implements OnInit {
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  public personalizacionStore = inject(PersonalizacionStore);

  publicando = signal(false);
  errorMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  estaLogueado = signal<boolean>(false);

  categorias = [
    { valor: 'caso-hacking', etiqueta: 'Caso de Hacking' },
    { valor: 'ayuda', etiqueta: 'Pedir Ayuda' },
    { valor: 'historia', etiqueta: 'Historia' },
    { valor: 'otro', etiqueta: 'Otro' },
  ];

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
    categoria: ['caso-hacking', [Validators.required]],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    link: [''],
  });

  ngOnInit(): void {
    this.estaLogueado.set(this.authService.estaLogueado());
    if (!this.estaLogueado()) {
      this.errorMsg.set('Debes iniciar sesión para publicar');
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  get titulo() { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  getTipoArchivo(archivo: File): string {
    if (archivo.type.startsWith('video/')) {
      return 'Video';
    } else if (archivo.type === 'image/gif') {
      return 'GIF';
    } else if (archivo.type.startsWith('image/')) {
      return 'Imagen';
    } else {
      return 'Documento';
    }
  }

  onArchivosSeleccionados(evento: Event): void {
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
      this.archivosSeleccionados.set(validos);
    }
  }

  quitarArchivo(nombre: string): void {
    this.archivosSeleccionados.update((lista) => lista.filter((f) => f.name !== nombre));
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Completa todos los campos obligatorios');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    if (!this.authService.estaLogueado()) {
      this.errorMsg.set('Debes iniciar sesión para publicar');
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }

    this.publicando.set(true);
    this.errorMsg.set(null);

    const datos = this.form.getRawValue();
    const formData = new FormData();
    formData.append('titulo', datos.titulo!);
    formData.append('categoria', datos.categoria!);
    formData.append('descripcion', datos.descripcion!);
    if (datos.link) formData.append('link', datos.link);
    
    const archivos = this.archivosSeleccionados();
    archivos.forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => {
        this.publicando.set(false);
        this.archivosSeleccionados.set([]);
        if (nuevoPost && nuevoPost.id) {
          this.router.navigate(['/comunidad', nuevoPost.id]);
        } else {
          this.router.navigate(['/comunidad']);
        }
      },
      error: (error) => {
        console.error('Error al publicar:', error);
        this.errorMsg.set(error.error?.mensaje || 'No se pudo publicar. Intenta nuevamente.');
        this.publicando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/comunidad']);
  }
}