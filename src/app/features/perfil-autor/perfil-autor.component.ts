import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UserService } from '../../core/services/user.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'kiert-perfil-autor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-autor.component.html',
  styleUrl: './perfil-autor.component.scss',
})
export class PerfilAutorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  public personalizacionStore = inject(PersonalizacionStore);

  autor = signal<User | null>(null);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  esContacto = signal(false);
  solicitudPendiente = signal(false);
  enviandoSolicitud = signal(false);
  esMiPerfil = signal(false);
  usuarioActual = this.authService.usuario;

  // Computed para el marco del autor (usa el store global)
  readonly frameClass = computed(() => {
    return this.personalizacionStore.marcoClase();
  });

  readonly frameStyle = computed(() => {
    return this.personalizacionStore.marcoEstilo();
  });

  readonly fondoGradiente = computed(() => {
    return this.personalizacionStore.fondoGradiente();
  });

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.params['id']);
    const usuarioActual = this.usuarioActual();
    
    if (!userId || isNaN(userId)) {
      this.errorMsg.set('Usuario no valido');
      this.cargando.set(false);
      return;
    }

    if (usuarioActual && usuarioActual.id === userId) {
      this.esMiPerfil.set(true);
      this.router.navigate(['/perfil']);
      return;
    }

    this.cargarAutor(userId);
    this.verificarEstadoContacto(userId);
  }

  cargarAutor(userId: number): void {
    this.cargando.set(true);
    this.userService.obtenerUsuarioPorId(userId).subscribe({
      next: (user) => {
        this.autor.set(user);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar el perfil del usuario');
        this.cargando.set(false);
      }
    });
  }

  verificarEstadoContacto(userId: number): void {
    this.chatService.sonContactos(userId).subscribe({
      next: (sonContactos) => this.esContacto.set(sonContactos),
      error: () => this.esContacto.set(false)
    });

    this.chatService.listarSolicitudes().subscribe({
      next: (solicitudes) => {
        const pendiente = solicitudes.some(s => 
          s.usuarioId === userId && s.estado === 'PENDIENTE'
        );
        this.solicitudPendiente.set(pendiente);
      },
      error: () => this.solicitudPendiente.set(false)
    });
  }

  enviarSolicitud(): void {
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.enviandoSolicitud.set(true);
    this.chatService.enviarSolicitud(autorId).subscribe({
      next: () => {
        this.solicitudPendiente.set(true);
        this.enviandoSolicitud.set(false);
        this.exitoMsg.set('Solicitud enviada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: () => {
        this.enviandoSolicitud.set(false);
        this.errorMsg.set('Error al enviar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  irAlChat(): void {
    const autorId = this.autor()?.id;
    if (autorId) {
      this.router.navigate(['/chat', autorId]);
    }
  }

  volver(): void {
    this.router.navigate(['/comunidad']);
  }
}