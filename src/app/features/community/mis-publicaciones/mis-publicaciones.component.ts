// src/app/features/community/mis-publicaciones/mis-publicaciones.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { Post } from '../../../core/models/post.model';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-mis-publicaciones',
  standalone: true,
  imports: [CommonModule, RouterLink, AvisoLoginComponent],
  templateUrl: './mis-publicaciones.component.html',
  styleUrl: './mis-publicaciones.component.scss',
})
export class MisPublicacionesComponent implements OnInit {
  private postService = inject(PostService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private confirm = inject(ConfirmService);
  public personalizacionStore = inject(PersonalizacionStore);

  posts = signal<Post[]>([]);
  cargando = signal<boolean>(true);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // ✅ AVISO LOGIN
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para ver y gestionar tus publicaciones.');

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  ngOnInit(): void {
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set('Debes registrarte para ver tus publicaciones.');
      this.mostrarAvisoLogin.set(true);
      this.cargando.set(false);
      return;
    }
    this.cargarMisPublicaciones();
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/mis-publicaciones' }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  cargarMisPublicaciones(): void {
    const userId = this.authService.usuario()?.id;
    if (!userId) {
      this.mensajeAvisoLogin.set('Debes registrarte para ver tus publicaciones.');
      this.mostrarAvisoLogin.set(true);
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.postService.listar().subscribe({
      next: (posts) => {
        const postsUsuario = posts.filter(p => p.autor.id === userId);
        this.posts.set(postsUsuario);
        this.cargando.set(false);
      },
      error: (error) => {
        console.error('Error al cargar publicaciones:', error);
        this.errorMsg.set('Error al cargar tus publicaciones');
        this.cargando.set(false);
      }
    });
  }

  async eliminarPublicacion(post: Post): Promise<void> {
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set('Debes registrarte para eliminar publicaciones.');
      this.mostrarAvisoLogin.set(true);
      return;
    }

    const ok = await this.confirm.eliminar(
      `Se eliminará permanentemente "${post.titulo}".`,
      '¿Eliminar publicación?'
    );

    if (!ok) return;

    this.postService.eliminar(post.id).subscribe({
      next: () => {
        this.posts.update(posts => posts.filter(p => p.id !== post.id));
        this.exitoMsg.set('Publicación eliminada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (error) => {
        console.error('Error al eliminar publicación:', error);
        this.errorMsg.set(error.error?.mensaje || 'Error al eliminar la publicación');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  volverAlFeed(): void {
    this.router.navigate(['/comunidad']);
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}
