// src/app/features/feed/feed.component.ts
import { Component, OnInit, OnDestroy, signal, computed, inject, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PostsOcultosService } from '../../../core/services/posts-ocultos.service';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-feed',
  standalone: true,
  imports: [PostCardComponent, CommonModule, AvisoLoginComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
})
export class FeedComponent implements OnInit, OnDestroy {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private postsOcultos = inject(PostsOcultosService);
  private router = inject(Router);

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  // ===== ESTADO =====
  posts = signal<Post[]>([]);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);

  postsVisibles = computed(() => this.postsOcultos.filtrar(this.posts()));
  totalOcultos = computed(() => this.postsOcultos.total());

  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para publicar en la comunidad.');

  // ===== CONFIRM RESTAURAR OCULTOS =====
  mostrarConfirmRestaurar = signal(false);

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  ngOnInit(): void {
    this.cargarPosts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  // ===== NAVEGACION =====
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/comunidad' } });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  irACrearPublicacion(event?: Event): void {
    event?.preventDefault();
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set('Debes registrarte para crear publicaciones.');
      this.mostrarAvisoLogin.set(true);
      return;
    }
    this.router.navigate(['/comunidad/nueva-publicacion']);
  }

  irAlPost(postId: number): void {
    if (Number.isFinite(postId) && Number.isInteger(postId) && postId > 0) {
      this.router.navigate(['/comunidad', postId]);
    }
  }

  // ===== CARGA =====
  cargarPosts(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.postService.listar()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.posts.set(Array.isArray(data) ? data : []);
          this.cargando.set(false);
        },
        error: (error) => {
          if (isDevMode()) console.error('FeedComponent: Error al cargar posts:', error);
          this.cargando.set(false);
          this.errorMsg.set('Error al cargar las publicaciones');
          this.posts.set([]);
        }
      });
  }

  recargar(): void {
    this.cargarPosts();
  }

  // ===== RESTAURAR OCULTOS (con modal propio) =====
  abrirConfirmRestaurar(): void {
    if (this.totalOcultos() === 0) return;
    this.mostrarConfirmRestaurar.set(true);
  }

  cerrarConfirmRestaurar(): void {
    this.mostrarConfirmRestaurar.set(false);
  }

  confirmarRestaurarTodos(): void {
    this.mostrarConfirmRestaurar.set(false);
    this.postsOcultos.mostrarTodos();
  }
}