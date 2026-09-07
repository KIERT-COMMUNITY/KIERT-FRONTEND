// feed.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PostService } from '../../../core/services/post.service';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

@Component({
  selector: 'kiert-feed',
  standalone: true,
  imports: [RouterLink, PostCardComponent, CommonModule],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  private postService = inject(PostService);
  private router = inject(Router);
  public personalizacionStore = inject(PersonalizacionStore);

  posts = signal<Post[]>([]);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    console.log('📋 FeedComponent: Inicializando');
    this.cargarPosts();
  }

  cargarPosts(): void {
    console.log('📋 FeedComponent: Cargando posts...');
    this.cargando.set(true);
    this.errorMsg.set(null);
    
    this.postService.listar().subscribe({
      next: (data) => {
        console.log('✅ FeedComponent: Posts recibidos:', data.length);
        this.posts.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('❌ FeedComponent: Error al cargar posts:', error);
        this.cargando.set(false);
        this.errorMsg.set('Error al cargar las publicaciones');
        this.posts.set([]);
      }
    });
  }

  recargar(): void {
    this.cargarPosts();
  }

  irAlPost(postId: number): void {
    console.log('🔍 FeedComponent: Navegando al post:', postId);
    if (postId && !isNaN(postId) && postId > 0) {
      this.router.navigate(['/comunidad', postId]);
    } else {
      console.error('❌ FeedComponent: ID inválido:', postId);
    }
  }
}