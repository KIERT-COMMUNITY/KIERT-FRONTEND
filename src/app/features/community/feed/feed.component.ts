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

  imagenes = {
    anuncioDestacado: 'assets/images/banner/banner.jpg',
    anuncios: [
      'assets/images/anuncio-banner/dianbanner1.jpg',
      'assets/images/anuncio-banner/yrelisbanner2.jpg',
      'assets/images/anuncio-banner/herlizbanner3.jpg',
      'assets/images/anuncio-banner/karnilbanner4.jpg',
      'assets/images/anuncio-banner/cykabanner5.jpg'
    ]
  };

  placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"%3E%3Crect width="200" height="100" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="12" fill="%232dd4bf" text-anchor="middle" dy=".3em"%3EAnuncio%3C/text%3E%3C/svg%3E';

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

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = this.placeholderImage;
    img.alt = '';
  }
}