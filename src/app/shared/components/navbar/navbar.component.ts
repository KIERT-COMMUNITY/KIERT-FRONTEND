// src/app/layouts/main-layout/navbar/navbar.component.ts
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
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';

@Component({
  selector: 'kiert-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificacionesComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() estadoContraidoChange = new EventEmitter<boolean>();

  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  public readonly adminAuth = inject(AdminAuthService);
  private readonly router = inject(Router);

  readonly menuAbierto = signal(false);
  readonly menuContraido = signal(false);
  readonly mensajesNoLeidos = signal(0);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.restaurarEstadoMenu();
    this.cargarMensajesNoLeidos();
    this.validarSesionAdmin();

    this.intervalId = setInterval(() => {
      this.cargarMensajesNoLeidos();
      this.validarSesionAdmin();
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
    if (this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) this.cerrarMenu();
  }

  alternarMenu(): void {
    this.menuAbierto.update((e) => !e);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  alternarMenuContraido(): void {
    if (window.innerWidth <= 1024) return;

    const nuevoEstado = !this.menuContraido();
    this.menuContraido.set(nuevoEstado);
    this.estadoContraidoChange.emit(nuevoEstado);

    try {
      localStorage.setItem('kiert-menu-contraido', String(nuevoEstado));
    } catch { /* ignore */ }
  }

  private validarSesionAdmin(): void {
    void this.adminAuth.estaLogueado();
  }

  cargarMensajesNoLeidos(): void {
    if (!this.authService.isAuthenticated()) {
      this.mensajesNoLeidos.set(0);
      return;
    }

    this.chatService.obtenerMensajesNoLeidos().subscribe({
      next: (cantidad: number) => this.mensajesNoLeidos.set(cantidad || 0),
      error: () => this.mensajesNoLeidos.set(0)
    });
  }

  // ===== NAVEGACIÓN =====
  irAlChat(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat']);
  }

  /** ✅ Chat Global (sala pública) */
  irAlChatGlobal(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat-global']);
  }

  irAlPanelReportes(): void {
    this.cerrarMenu();
    if (!this.adminAuth.esAdminOMayor()) {
      this.router.navigate(['/comunidad']);
      return;
    }
    this.router.navigate(['/admin/reportes']);
  }

  irAlPanelAnuncios(): void {
    this.cerrarMenu();
    if (!this.adminAuth.esAdminOMayor()) {
      this.router.navigate(['/comunidad']);
      return;
    }
    this.router.navigate(['/admin/anuncios']);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.adminAuth.logout();
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