// create-post.component.ts -> formulario para publicar un caso/duda/historia.
// Permite adjuntar archivos (se subirán a Supabase) y/o links externos.
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent {
  publicando = signal(false);
  errorMsg = signal<string | null>(null);

  // signal con la lista de archivos elegidos (no van dentro del FormGroup:
  // los <input type="file"> no se manejan bien con Reactive Forms directamente)
  archivosSeleccionados = signal<File[]>([]);

  form = this.fb.group({
    titulo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(120)]],
    categoria: ['caso-hacking', [Validators.required]],
    descripcion: ['', [Validators.required, Validators.minLength(20)]],
    link: [''], // link externo opcional (ej: artículo, evidencia en la nube, etc.)
  });

  constructor(private fb: FormBuilder, private postService: PostService, private router: Router) {}

  get titulo() { return this.form.controls.titulo; }
  get descripcion() { return this.form.controls.descripcion; }

  // Se ejecuta cuando el usuario elige archivos en el <input type="file">
  onArchivosSeleccionados(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (!input.files) return;

    // Límite simple de peso: máx 10MB por archivo, para no "pesar" la base de datos/bucket
    const validos = Array.from(input.files).filter((f) => f.size <= 10 * 1024 * 1024);
    this.archivosSeleccionados.set(validos);
  }

  quitarArchivo(nombre: string): void {
    this.archivosSeleccionados.update((lista) => lista.filter((f) => f.name !== nombre));
  }

  publicar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.publicando.set(true);
    this.errorMsg.set(null);

    // FormData: necesario para poder enviar texto + archivos binarios en la misma petición
    const datos = this.form.getRawValue();
    const formData = new FormData();
    formData.append('titulo', datos.titulo!);
    formData.append('categoria', datos.categoria!);
    formData.append('descripcion', datos.descripcion!);
    if (datos.link) formData.append('link', datos.link);
    this.archivosSeleccionados().forEach((archivo) => formData.append('archivos', archivo));

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => this.router.navigate(['/comunidad', nuevoPost.id]),
      error: () => {
        this.errorMsg.set('No se pudo publicar. Intenta nuevamente.');
        this.publicando.set(false);
      },
    });
  }
}
