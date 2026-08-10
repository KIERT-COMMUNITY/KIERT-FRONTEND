// feed.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { Post } from '../../../core/models/post.model';  // ✅ Importar Post
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-feed',
  standalone: true,
  imports: [RouterLink, PostCardComponent, CommonModule],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  private postService = inject(PostService);

  posts = signal<Post[]>([]);
  cargando = signal(true);

  ngOnInit(): void {
    this.postService.listar().subscribe({
      next: (data) => {
        this.posts.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      }
    });
  }
}