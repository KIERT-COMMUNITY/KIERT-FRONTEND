// src/app/features/profile/profile.component.ts
import { Component, signal, computed, inject, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { BloqueoService } from '../../core/services/bloqueo.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { ImageSanitizerService } from '../../core/services/image-sanitizer.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'kiert-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private bloqueoService = inject(BloqueoService);
  private imageSanitizer = inject(ImageSanitizerService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== ESTADO =====
  subiendoFoto = signal(false);
  previsualizacion = signal<string | null>(null);
  editando = signal(false);
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // ===== ✅ ELIMINAR FOTO =====
  mostrarConfirmEliminarFoto = signal(false);
  eliminandoFoto = signal(false);

  // ===== ESTADÍSTICAS =====
  totalPosts = signal(0);
  totalBloqueados = signal(0);

  // ===== USUARIO =====
  usuario = this.authService.usuario;

  inicial = computed(() => {
    const nombre = this.usuario()?.nombreUsuario;
    return nombre?.charAt(0)?.toUpperCase() || '?';
  });

  nombreCompleto = computed(() => this.usuario()?.nombreUsuario || 'Usuario');
  email = computed(() => this.usuario()?.email || 'Sin correo');
  fotoPerfil = computed(() => this.usuario()?.fotoPerfilUrl || null);

  // ===== FORMULARIO =====
  formEditar = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    effect(() => {
      const tema = this.personalizacionStore.temaId();
      this.aplicarTemaGlobal(tema);
    });
  }

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarDatosUsuario();

    const tema = this.personalizacionStore.temaId();
    this.aplicarTemaGlobal(tema);
  }

  // ============================================================
  // APLICAR TEMA GLOBAL
  // ============================================================
  private aplicarTemaGlobal(themeId: string): void {
    const html = document.documentElement;
    const body = document.body;

    const limpiar = (el: HTMLElement) => {
      el.removeAttribute('data-theme');
      Array.from(el.classList)
        .filter(c => c.startsWith('tema-'))
        .forEach(c => el.classList.remove(c));
    };

    limpiar(html);
    limpiar(body);

    const tema = themeId && themeId !== 'default' ? themeId : 'default';

    html.setAttribute('data-theme', tema);
    html.classList.add(`tema-${tema}`);
    body.setAttribute('data-theme', tema);
    body.classList.add(`tema-${tema}`);
  }

  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formEditar.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
      });
    }
  }

  cargarEstadisticas(): void {
    this.postService.listar().subscribe({
      next: (posts) => {
        const userId = this.usuario()?.id;
        if (userId) {
          this.totalPosts.set(posts.filter(p => p.autor.id === userId).length);
        }
      },
      error: () => {}
    });

    this.bloqueoService.listarBloqueados().subscribe({
      next: (bloqueados) => this.totalBloqueados.set(bloqueados.length),
      error: () => {}
    });
  }

  // ============================================================
  // SUBIR FOTO DE PERFIL
  // ============================================================
  async onFotoSeleccionada(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivoOriginal = input.files?.[0];
    if (!archivoOriginal) return;

    if (!archivoOriginal.type.startsWith('image/')) {
      this.errorMsg.set('Solo se permiten imágenes');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    if (archivoOriginal.size > 10 * 1024 * 1024) {
      this.errorMsg.set('La imagen no debe superar los 10MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    try {
      const archivoLimpio = await this.imageSanitizer.limpiarFotoPerfil(archivoOriginal);

      const lector = new FileReader();
      lector.onload = () => this.previsualizacion.set(lector.result as string);
      lector.readAsDataURL(archivoLimpio);

      this.subiendoFoto.set(true);
      this.errorMsg.set(null);

      this.authService.subirFotoMultipart(archivoLimpio).subscribe({
        next: (usuarioActualizado: User) => {
          this.subiendoFoto.set(false);
          this.previsualizacion.set(null);
          this.exitoMsg.set('Foto actualizada correctamente');
          setTimeout(() => this.exitoMsg.set(null), 3000);
          this.authService.usuario.set(usuarioActualizado);
          this.personalizacionStore.recargar();
          this.cdr.detectChanges();
        },
        error: () => {
          this.subiendoFoto.set(false);
          this.errorMsg.set('Error al actualizar la foto');
          setTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      this.errorMsg.set('Error al procesar la imagen');
      setTimeout(() => this.errorMsg.set(null), 3000);
    } finally {
      input.value = '';
    }
  }

  // ============================================================
  // ✅ ELIMINAR FOTO DE PERFIL
  // ============================================================
  abrirConfirmEliminarFoto(): void {
    this.mostrarConfirmEliminarFoto.set(true);
  }

  cerrarConfirmEliminarFoto(): void {
    if (this.eliminandoFoto()) return;
    this.mostrarConfirmEliminarFoto.set(false);
  }

  confirmarEliminarFoto(): void {
    this.eliminandoFoto.set(true);
    this.errorMsg.set(null);

    this.authService.eliminarFotoPerfil().subscribe({
      next: (usuarioActualizado: User) => {
        this.eliminandoFoto.set(false);
        this.mostrarConfirmEliminarFoto.set(false);
        this.authService.usuario.set(usuarioActualizado);
        this.exitoMsg.set('Foto de perfil eliminada');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.eliminandoFoto.set(false);
        this.mostrarConfirmEliminarFoto.set(false);
        const mensaje = err?.error?.error || err?.error?.mensaje || 'Error al eliminar la foto';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 4000);
      }
    });
  }

  // ============================================================
  // EDITAR PERFIL
  // ============================================================
  toggleEditar(): void {
    this.editando.set(!this.editando());
    if (this.editando()) {
      this.cargarDatosUsuario();
    }
  }

  guardarCambios(): void {
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Perfil actualizado correctamente');
      this.editando.set(false);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 1000);
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  irHistorialPublicaciones(): void {
    this.router.navigate(['/mis-publicaciones']);
  }

  irAlChat(): void {
    this.router.navigate(['/chat']);
  }

  irAjustes(): void {
    this.router.navigate(['/ajustes']);
  }

  irABloqueados(): void {
    this.router.navigate(['/ajustes'], { fragment: 'bloqueados' });
  }

  logout(): void {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }
}