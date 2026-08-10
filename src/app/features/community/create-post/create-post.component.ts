// create-post.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent implements OnInit {
  publicando = signal(false);
  errorMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  estaLogueado = signal<boolean>(false);

  categorias = [
    { valor: 'caso-hacking', etiqueta: 'Caso de Hacking' },
    { valor: 'ayuda', etiqueta: 'Piden Ayuda' },
    { valor: 'historia', etiqueta: 'Historia' },
    { valor: 'otro', etiqueta: 'Otro' },
  ];

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
    categoria: ['caso-hacking', [Validators.required]],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    link: [''],
  });

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.estaLogueado.set(this.authService.estaLogueado());
    if (!this.estaLogueado()) {
      this.errorMsg.set('Debes iniciar sesión para publicar');
      setTimeout(() => this.router.navigate(['/login']), 2000);
    }
  }

  get titulo() { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  onArchivosSeleccionados(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (!input.files) return;

    const validos = Array.from(input.files).filter((f) => f.size <= 10 * 1024 * 1024);
    
    if (validos.length !== input.files.length) {
      this.errorMsg.set('Algunos archivos exceden el límite de 10MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
    }
    
    this.archivosSeleccionados.set(validos);
  }

  quitarArchivo(nombre: string): void {
    this.archivosSeleccionados.update((lista) => lista.filter((f) => f.name !== nombre));
  }

  // ✅ Publicar - El backend sube los archivos a Cloudinary
  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Por favor, completa todos los campos obligatorios');
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
    
    // ✅ Agregar archivos al FormData (el backend los subirá a Cloudinary)
    this.archivosSeleccionados().forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    console.log('📤 Enviando post con', this.archivosSeleccionados().length, 'archivo(s)');

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => {
        console.log('✅ Post creado exitosamente:', nuevoPost);
        this.publicando.set(false);
        this.router.navigate(['/comunidad', nuevoPost.id]);
      },
      error: (error) => {
        console.error('❌ Error al publicar:', error);
        
        let mensajeError = 'No se pudo publicar. Intenta nuevamente.';
        
        if (error.status === 0) {
          mensajeError = 'Error de conexión con el servidor. Verifica que el backend esté corriendo.';
        } else if (error.status === 401) {
          mensajeError = 'Sesión expirada. Inicia sesión nuevamente.';
          this.authService.logout();
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else if (error.status === 403) {
          mensajeError = 'No tienes permiso para publicar.';
        } else if (error.status === 400) {
          mensajeError = 'Datos inválidos. Revisa el formulario.';
          if (error.error?.errors) {
            const errores = error.error.errors.map((e: any) => e.message).join(', ');
            mensajeError = 'Errores: ' + errores;
          }
        } else if (error.error?.mensaje) {
          mensajeError = error.error.mensaje;
        } else if (error.message) {
          mensajeError = error.message;
        }
        
        this.errorMsg.set(mensajeError);
        this.publicando.set(false);
      },
    });
  }
}