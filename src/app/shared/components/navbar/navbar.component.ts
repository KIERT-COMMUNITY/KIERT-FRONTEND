import {
  Component,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';

@Component({
  selector: 'kiert-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    NotificacionesComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() estadoContraidoChange = new EventEmitter<boolean>();

  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);
  readonly menuContraido = signal(false);
  readonly mensajesNoLeidos = signal(0);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.restaurarEstadoMenu();
    this.cargarMensajesNoLeidos();

    this.intervalId = setInterval(() => {
      this.cargarMensajesNoLeidos();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuAbierto()) {
      this.cerrarMenu();
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) {
      this.cerrarMenu();
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update((estadoActual) => !estadoActual);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  alternarMenuContraido(): void {
    if (window.innerWidth <= 1024) {
      return;
    }

    const nuevoEstado = !this.menuContraido();
    this.menuContraido.set(nuevoEstado);
    this.estadoContraidoChange.emit(nuevoEstado);

    try {
      localStorage.setItem('kiert-menu-contraido', String(nuevoEstado));
    } catch {
      // La aplicacion continua si el almacenamiento no esta disponible.
    }
  }

  cargarMensajesNoLeidos(): void {
    if (!this.authService.isAuthenticated()) {
      this.mensajesNoLeidos.set(0);
      return;
    }

    this.chatService.obtenerMensajesNoLeidos().subscribe({
      next: (cantidad: number) => {
        this.mensajesNoLeidos.set(cantidad || 0);
      },
      error: () => {
        this.mensajesNoLeidos.set(0);
      }
    });
  }

  irAlChat(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat']);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private restaurarEstadoMenu(): void {
    let estadoGuardado = false;

    try {
      estadoGuardado = localStorage.getItem('kiert-menu-contraido') === 'true';
    } catch {
      estadoGuardado = false;
    }

    this.menuContraido.set(estadoGuardado);
    this.estadoContraidoChange.emit(estadoGuardado);
  }
}