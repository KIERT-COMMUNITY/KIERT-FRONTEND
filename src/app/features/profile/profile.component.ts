// profile.component.ts - Perfil completo con estadísticas y edición
import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';
import { PostService } from '../../core/services/post.service';
import { ChatService } from '../../core/services/chat.service';
import { Post } from '../../core/models/post.model';

@Component({
  selector: 'kiert-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private uploadService = inject(UploadService);
  private postService = inject(PostService);
  private chatService = inject(ChatService);
  private fb = inject(FormBuilder);

  // Estados
  subiendoFoto = signal(false);
  previsualizacion = signal<string | null>(null);
  editando = signal(false);
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // Estadísticas
  totalPosts = signal(0);
  totalComentarios = signal(0);
  totalConversaciones = signal(0);

  // Mis publicaciones
  misPosts = signal<Post[]>([]);
  cargandoPosts = signal(false);

  // Etiquetas de categoría
  etiquetas: Record<string, string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };

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
    this.cargandoPosts.set(true);
    this.postService.listar().subscribe({
      next: (posts) => {
        const userId = this.usuario()?.id;
        if (userId) {
          const mios = posts.filter(p => p.autor.id === userId);
          this.totalPosts.set(mios.length);
          this.misPosts.set(mios);
        }
        this.cargandoPosts.set(false);
      },
      error: () => {
        this.cargandoPosts.set(false);
        console.error('Error al cargar estadísticas');
      }
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

    // Validar tipo y tamaño
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

    // Vista previa
    const lector = new FileReader();
    lector.onload = () => this.previsualizacion.set(lector.result as string);
    lector.readAsDataURL(archivo);

    this.subiendoFoto.set(true);
    this.errorMsg.set(null);

    this.uploadService.subirFotoPerfil(archivo).subscribe({
      next: (user) => {
        this.subiendoFoto.set(false);
        this.previsualizacion.set(null);
        this.authService.actualizarUsuario(user);
        this.exitoMsg.set('Foto actualizada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.subiendoFoto.set(false);
        this.errorMsg.set(err?.error?.mensaje || 'Error al subir la foto');
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
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
    
    // Aquí iría la llamada al backend para actualizar el perfil
    // Por ahora simulamos éxito
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Perfil actualizado correctamente');
      this.editando.set(false);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 1000);
  }

  // ========== CERRAR SESIÓN ==========
  logout(): void {
    if (confirm('¿Seguro que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }

  // ========== IR AL CHAT ==========
  irAlChat(): void {
    // Redirigir al chat
  }

  // ========== MIS PUBLICACIONES ==========
  irAMisPublicaciones(): void {
    document.getElementById('mis-publicaciones')?.scrollIntoView({ behavior: 'smooth' });
  }

  eliminarPost(post: Post): void {
    if (!confirm(`¿Seguro que quieres eliminar "${post.titulo}"? Esta acción no se puede deshacer.`)) return;
    this.postService.eliminar(post.id).subscribe({
      next: () => {
        this.misPosts.update(lista => lista.filter(p => p.id !== post.id));
        this.totalPosts.set(this.misPosts().length);
        this.exitoMsg.set('Publicación eliminada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.mensaje || 'Error al eliminar la publicación');
        setTimeout(() => this.errorMsg.set(null), 3000);
      },
    });
  }

  // ========== OBTENER INICIAL ==========
  getInicial(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }
}