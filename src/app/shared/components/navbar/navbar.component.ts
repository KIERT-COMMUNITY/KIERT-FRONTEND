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
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { StorageService } from '../../../core/services/storage.service';
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
  public readonly adminAuth = inject(AdminAuthService);
  private readonly chatService = inject(ChatService);
  private readonly storage = inject(StorageService);
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
    if (this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) this.cerrarMenu();
  }

  alternarMenu(): void { this.menuAbierto.update((v) => !v); }
  cerrarMenu(): void { this.menuAbierto.set(false); }

  alternarMenuContraido(): void {
    if (window.innerWidth <= 1024) return;

    const nuevo = !this.menuContraido();
    this.menuContraido.set(nuevo);
    this.estadoContraidoChange.emit(nuevo);

    // Preferencia de UI compartida entre pestañas
    this.storage.setLocal('kiert-menu-contraido', String(nuevo));
  }

  cargarMensajesNoLeidos(): void {
    if (!this.authService.isAuthenticated() && !this.adminAuth.estaLogueado()) {
      this.mensajesNoLeidos.set(0);
      return;
    }
    this.chatService.obtenerMensajesNoLeidos().subscribe({
      next: (n: number) => this.mensajesNoLeidos.set(n || 0),
      error: () => this.mensajesNoLeidos.set(0)
    });
  }

  irAlChat(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat']);
  }

  irAlChatGlobal(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat-global']);
  }

  irAlPanelReportes(): void {
    this.cerrarMenu();
    if (!this.adminAuth.estaLogueado()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.router.navigate(['/admin/reportes']);
  }

  irAlPanelAnuncios(): void {
    this.cerrarMenu();
    if (!this.adminAuth.estaLogueado()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    if (!this.adminAuth.esAdminOMayor()) {
      this.router.navigate(['/admin/reportes']);
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
    const guardado = this.storage.getLocal('kiert-menu-contraido') === 'true';
    this.menuContraido.set(guardado);
    this.estadoContraidoChange.emit(guardado);
  }
}