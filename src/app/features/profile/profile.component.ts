import { Component, signal, computed, inject, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { BloqueoService } from '../../core/services/bloqueo.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
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
      const personalizacion = this.personalizacionStore.personalizacion();
      if (personalizacion) {
        console.log('🔄 Profile - Personalización aplicada:', personalizacion);
        this.cdr.detectChanges();
      }
    });
  }

  ngOnInit(): void {
    this.cargarEstadisticas();
    this.cargarDatosUsuario();
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
    // Posts del usuario
    this.postService.listar().subscribe({
      next: (posts) => {
        const userId = this.usuario()?.id;
        if (userId) {
          this.totalPosts.set(posts.filter(p => p.autor.id === userId).length);
        }
      },
      error: () => {}
    });

    // Bloqueados
    this.bloqueoService.listarBloqueados().subscribe({
      next: (bloqueados) => this.totalBloqueados.set(bloqueados.length),
      error: () => {}
    });
  }

  onFotoSeleccionada(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      this.errorMsg.set('Solo se permiten imágenes');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      this.errorMsg.set('La imagen no debe superar los 5MB');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    const lector = new FileReader();
    lector.onload = () => this.previsualizacion.set(lector.result as string);
    lector.readAsDataURL(archivo);

    this.subiendoFoto.set(true);
    this.errorMsg.set(null);

    this.authService.subirFotoMultipart(archivo).subscribe({
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
  }

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
    this.router.navigate(['/bloqueados']);
  }

  logout(): void {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }
}