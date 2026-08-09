// post-detail.component.ts -> vista completa de UNA publicación + sus comentarios.
// El "id" llega como @Input() automático gracias a withComponentInputBinding()
// que configuramos en app.config.ts (evita usar ActivatedRoute manualmente).
import { Component, OnInit, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PostService } from '../../../core/services/post.service';
import { Post, Comentario } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
})
export class PostDetailComponent implements OnInit {
  // input con transform: convierte el parámetro de la URL (string) a number
  id = input.required<string>();

  post = signal<Post | undefined>(undefined);
  comentarios = signal<Comentario[]>([]);
  cargando = signal(true);
  enviandoComentario = signal(false);

  formComentario = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(2)]],
  });

  constructor(private postService: PostService, private fb: FormBuilder) {}

  ngOnInit(): void {
    const postId = Number(this.id());

    this.postService.obtenerPorId(postId).subscribe((data) => {
      this.post.set(data);
      this.cargando.set(false);
    });

    this.postService.listarComentarios(postId).subscribe((data) => this.comentarios.set(data));
  }

  enviarComentario(): void {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    this.enviandoComentario.set(true);
    const contenido = this.formComentario.getRawValue().contenido!;

    this.postService.comentar(Number(this.id()), contenido).subscribe({
      next: (nuevo) => {
        // actualiza la lista sin recargar toda la página (mejor experiencia)
        this.comentarios.update((lista) => [...lista, nuevo]);
        this.formComentario.reset();
        this.enviandoComentario.set(false);
      },
      error: () => this.enviandoComentario.set(false),
    });
  }
}
