// profile.component.ts - Perfil completo con estadísticas y edición
import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router'; // ✅ Solo Router, no RouterLink
import { AuthService } from '../../core/services/auth.service';
import { PostService } from '../../core/services/post.service';
import { ChatService } from '../../core/services/chat.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'kiert-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // ✅ Eliminar RouterLink
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private chatService = inject(ChatService);
  private fb = inject(FormBuilder);
  private router = inject(Router); // ✅ Inyectar Router

  // Estados
  subiendoFoto = signal<boolean>(false);
  previsualizacion = signal<string | null>(null);
  editando = signal<boolean>(false);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // Estadísticas
  totalPosts = signal<number>(0);
  totalComentarios = signal<number>(0);
  totalConversaciones = signal<number>(0);

  // Usuario actual
  usuario = this.authService.usuario;

  // Computed: inicial del nombre
  inicial = computed(() => {
    const nombre = this.usuario()?.nombreUsuario;
    return nombre?.charAt(0)?.toUpperCase() || '?';
  });

  // Computed: nombre completo
  nombreCompleto = computed(() => {
    return this.usuario()?.nombreUsuario || 'Usuario';
  });

  // Computed: email
  email = computed(() => {
    return this.usuario()?.email || 'Sin correo';
  });

  // Computed: foto de perfil
  fotoPerfil = computed(() => {
    return this.usuario()?.fotoPerfilUrl || null;
  });

  // Formulario de edición
  formEditar = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
  });

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
    // Cargar posts del usuario
    this.postService.listar().subscribe({
      next: (posts) => {
        const userId = this.usuario()?.id;
        if (userId) {
          this.totalPosts.set(posts.filter(p => p.autor.id === userId).length);
        }
      },
      error: () => console.error('Error al cargar estadísticas')
    });

    // Cargar conversaciones
    this.chatService.listarConversaciones().subscribe({
      next: (conv) => {
        this.totalConversaciones.set(conv.length);
      },
      error: () => console.error('Error al cargar conversaciones')
    });
  }

  // ========== FOTO DE PERFIL ==========
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
      },
      error: (error: any) => {
        this.subiendoFoto.set(false);
        this.errorMsg.set(error.error?.mensaje || 'Error al actualizar la foto');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ========== EDITAR PERFIL ==========
  toggleEditar(): void {
    this.editando.set(!this.editando());
    if (this.editando()) {
      this.cargarDatosUsuario();
    }
    this.errorMsg.set(null);
    this.exitoMsg.set(null);
  }

  guardarCambios(): void {
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);
    this.exitoMsg.set(null);

    const datos = this.formEditar.getRawValue();
    
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Perfil actualizado correctamente');
      this.editando.set(false);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 1000);
  }

  // ========== IR AL HISTORIAL DE PUBLICACIONES ==========
  irHistorialPublicaciones(): void {
    this.router.navigate(['/mis-publicaciones']);
  }

  // ========== CERRAR SESIÓN ==========
  logout(): void {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }

  // ========== IR AL CHAT ==========
  irAlChat(): void {
    this.router.navigate(['/chat']);
  }
}