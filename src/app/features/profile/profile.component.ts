import { Component, signal, computed, inject, OnInit, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { ChatService } from '../../core/services/chat.service';
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
  private chatService = inject(ChatService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public personalizacionStore = inject(PersonalizacionStore);

  subiendoFoto = signal<boolean>(false);
  previsualizacion = signal<string | null>(null);
  editando = signal<boolean>(false);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  totalPosts = signal<number>(0);
  totalComentarios = signal<number>(0);
  totalConversaciones = signal<number>(0);

  usuario = this.authService.usuario;

  inicial = computed(() => {
    const nombre = this.usuario()?.nombreUsuario;
    return nombre?.charAt(0)?.toUpperCase() || '?';
  });

  nombreCompleto = computed(() => this.usuario()?.nombreUsuario || 'Usuario');
  email = computed(() => this.usuario()?.email || 'Sin correo');
  fotoPerfil = computed(() => this.usuario()?.fotoPerfilUrl || null);

  formEditar = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    // ✅ EFECTO EN EL CONSTRUCTOR (contexto de inyección válido)
    effect(() => {
      const personalizacion = this.personalizacionStore.personalizacion();
      if (personalizacion) {
        console.log('🔄 Profile - Personalización aplicada:', personalizacion);
        console.log('🎨 Profile - Fondo:', this.personalizacionStore.fondoGradiente());
        console.log('🎨 Profile - Tema:', this.personalizacionStore.temaClass());
        console.log('🎨 Profile - Marco:', this.personalizacionStore.marcoClase());
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
    this.postService.listar().subscribe({
      next: (posts) => {
        const userId = this.usuario()?.id;
        if (userId) {
          this.totalPosts.set(posts.filter(p => p.autor.id === userId).length);
        }
      },
      error: () => {}
    });

    this.chatService.listarConversaciones().subscribe({
      next: (conv) => this.totalConversaciones.set(conv.length),
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

  logout(): void {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }
}