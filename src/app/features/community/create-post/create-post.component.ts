// create-post.component.ts
import { Component, signal, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Adjunto } from '../../../core/models/post.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-create-post',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './create-post.component.html',
  styleUrl: './create-post.component.scss',
})
export class CreatePostComponent implements OnInit {
  private route = inject(ActivatedRoute);

  publicando = signal(false);
  errorMsg = signal<string | null>(null);
  archivosSeleccionados = signal<File[]>([]);
  estaLogueado = signal<boolean>(false);
  esEdicion = signal(false);
  cargando = signal(false);
  adjuntosActuales = signal<Adjunto[]>([]);
  adjuntosAEliminar = signal<Adjunto[]>([]);
  postId: number | null = null;

  // ✅ Sin emojis
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

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.estaLogueado.set(this.authService.estaLogueado());
    if (!this.estaLogueado()) {
      this.errorMsg.set('Debes iniciar sesion para publicar');
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.esEdicion.set(true);
      this.postId = Number(id);
      this.cargando.set(true);
      this.postService.obtenerPorId(this.postId).subscribe({
        next: (post) => {
          if (post.autor.id !== this.authService.usuario()?.id) {
            this.errorMsg.set('Solo el autor puede editar esta publicacion');
            setTimeout(() => this.router.navigate(['/comunidad', this.postId]), 2000);
            return;
          }
          if (!this.categorias.some((c) => c.valor === post.categoria)) {
            this.categorias.push({ valor: post.categoria, etiqueta: post.categoria });
          }
          const link = post.adjuntos.find((a) => a.tipo === 'link')?.url ?? '';
          this.adjuntosActuales.set(post.adjuntos.filter((a) => a.tipo !== 'link'));
          this.form.patchValue({
            titulo: post.titulo,
            categoria: post.categoria,
            descripcion: post.descripcion,
            link,
          });
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.errorMsg.set('No se pudo cargar la publicacion');
        },
      });
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

  marcarParaEliminar(adjunto: Adjunto): void {
    this.adjuntosActuales.update((lista) => lista.filter((a) => a.id !== adjunto.id));
    this.adjuntosAEliminar.update((lista) => [...lista, adjunto]);
  }

  restaurarAdjunto(adjunto: Adjunto): void {
    this.adjuntosAEliminar.update((lista) => lista.filter((a) => a.id !== adjunto.id));
    this.adjuntosActuales.update((lista) => [...lista, adjunto]);
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

    if (this.esEdicion() && this.postId) {
      const datos = this.form.getRawValue();
      const formData = new FormData();
      formData.append('titulo', datos.titulo!);
      formData.append('categoria', datos.categoria!);
      formData.append('descripcion', datos.descripcion!);
      formData.append('link', datos.link ?? '');
      this.adjuntosAEliminar().forEach((adjunto) => {
        formData.append('adjuntosEliminar', String(adjunto.id));
      });
      this.archivosSeleccionados().forEach((archivo) => {
        formData.append('archivos', archivo);
      });

      this.postService.actualizar(this.postId, formData).subscribe({
        next: () => {
          this.publicando.set(false);
          this.router.navigate(['/comunidad', this.postId]);
        },
        error: (error) => {
          console.error('Error al actualizar:', error);
          this.errorMsg.set('No se pudo guardar los cambios. Intenta nuevamente.');
          this.publicando.set(false);
        },
      });
      return;
    }

    const datos = this.form.getRawValue();
    const formData = new FormData();
    formData.append('titulo', datos.titulo!);
    formData.append('categoria', datos.categoria!);
    formData.append('descripcion', datos.descripcion!);
    if (datos.link) formData.append('link', datos.link);
    
    this.archivosSeleccionados().forEach((archivo) => {
      formData.append('archivos', archivo);
    });

    this.postService.crear(formData).subscribe({
      next: (nuevoPost) => {
        this.publicando.set(false);
        this.router.navigate(['/comunidad', nuevoPost.id]);
      },
      error: (error) => {
        console.error('Error al publicar:', error);
        this.errorMsg.set('No se pudo publicar. Intenta nuevamente.');
        this.publicando.set(false);
      },
    });
  }
}