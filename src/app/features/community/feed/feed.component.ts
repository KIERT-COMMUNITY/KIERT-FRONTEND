// feed.component.ts -> pantalla principal de la comunidad: lista de publicaciones.
// Incluye filtro por categoría (client-side, sobre los datos ya cargados).
import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';

type Filtro = Post['categoria'] | 'todos';

@Component({
  selector: 'kiert-feed',
  standalone: true,
  imports: [RouterLink, PostCardComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  posts = signal<Post[]>([]);      // todos los posts que llegaron del backend
  cargando = signal(true);
  filtroActivo = signal<Filtro>('todos');

  filtros: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' },
    { valor: 'caso-hacking', etiqueta: 'Casos de hacking' },
    { valor: 'ayuda', etiqueta: 'Piden ayuda' },
    { valor: 'historia', etiqueta: 'Historias' },
  ];

  // computed(): se recalcula solo cuando cambia posts() o filtroActivo()
  postsFiltrados = computed(() => {
    const filtro = this.filtroActivo();
    const lista = this.posts();
    return filtro === 'todos' ? lista : lista.filter((p) => p.categoria === filtro);
  });

  constructor(private postService: PostService) {}

  ngOnInit(): void {
    this.postService.listar().subscribe((data) => {
      this.posts.set(data);
      this.cargando.set(false);
    });
  }

  cambiarFiltro(valor: Filtro): void {
    this.filtroActivo.set(valor);
  }
}
