// create-post.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
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
  private fb = inject(FormBuilder);
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);

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
      this.errorMsg.set('Debes iniciar sesion para publicar');
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
      this.errorMsg.set('Algunos archivos exceden el limite de 10MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
    }
    
    this.archivosSeleccionados.set(validos);
  }

  quitarArchivo(nombre: string): void {
    this.archivosSeleccionados.update((lista) => lista.filter((f) => f.name !== nombre));
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Por favor, completa todos los campos obligatorios');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    if (!this.authService.estaLogueado()) {
      this.errorMsg.set('Debes iniciar sesion para publicar');
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
    
    this.archivosSeleccionados().forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    console.log('📤 Enviando publicación...');
    console.log('📄 Título:', datos.titulo);
    console.log('📎 Archivos:', this.archivosSeleccionados().length);

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => {
        console.log('✅ Post creado exitosamente:', nuevoPost);
        console.log('🆔 ID del post:', nuevoPost.id);
        this.publicando.set(false);
        
        if (nuevoPost && nuevoPost.id) {
          this.router.navigate(['/comunidad', nuevoPost.id]);
        } else {
          this.router.navigate(['/comunidad']);
        }
      },
      error: (error) => {
        console.error('❌ Error al publicar:', error);
        this.errorMsg.set(error.error?.mensaje || 'No se pudo publicar. Intenta nuevamente.');
        this.publicando.set(false);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/comunidad']);
  }
}