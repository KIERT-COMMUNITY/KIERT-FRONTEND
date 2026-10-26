// src/app/features/feed/feed.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';                 // ✅ RouterLink eliminado
import { CommonModule } from '@angular/common';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-feed',
  standalone: true,
  imports: [PostCardComponent, CommonModule, AvisoLoginComponent], // ✅ RouterLink eliminado
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);

  posts = signal<Post[]>([]);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);

  // ✅ AVISO LOGIN
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para publicar en la comunidad.');

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  ngOnInit(): void {
    this.cargarPosts();
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/comunidad' }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  /** ✅ Botón "Publicar" clic */
  irACrearPublicacion(event?: Event): void {
    event?.preventDefault();
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set('Debes registrarte para crear publicaciones.');
      this.mostrarAvisoLogin.set(true);
      return;
    }
    this.router.navigate(['/comunidad/nueva-publicacion']);
  }

  cargarPosts(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.postService.listar().subscribe({
      next: (data) => {
        this.posts.set(data);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('FeedComponent: Error al cargar posts:', error);
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
    if (postId && !isNaN(postId) && postId > 0) {
      this.router.navigate(['/comunidad', postId]);
    }
  }
}