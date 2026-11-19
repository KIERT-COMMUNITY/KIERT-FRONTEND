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
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';
import { environment } from '../../../../environments/environment';

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
  private readonly personalizacionStore = inject(PersonalizacionStore);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly chatPrivadoHabilitado = environment.chatPrivadoEnabled ?? false;

  readonly menuAbierto = signal(false);
  readonly menuContraido = signal(false);
  readonly mensajesNoLeidos = signal(0);

  // ✅ Estado del panel de notificaciones flotante
  readonly panelNotificacionesAbierto = signal(false);
  readonly notificacionesNoLeidas = signal(0);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.restaurarEstadoMenu();

    // Refresco de contadores
    this.cargarContadorNotificaciones();

    if (this.chatPrivadoHabilitado) {
      this.cargarMensajesNoLeidos();
    }

    this.intervalId = setInterval(() => {
      if (this.chatPrivadoHabilitado) this.cargarMensajesNoLeidos();
      this.cargarContadorNotificaciones();
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
    if (this.panelNotificacionesAbierto()) {
      this.cerrarPanelNotificaciones();
      return;
    }
    if (this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.panelNotificacionesAbierto()) return;
    const t = ev.target as HTMLElement;
    // Si el clic está dentro del panel o del botón, no cerrar
    if (
      t.closest('.notificaciones-panel-flotante') ||
      t.closest('.btn-notificaciones-trigger')
    ) return;
    this.cerrarPanelNotificaciones();
  }

  alternarMenu(): void { this.menuAbierto.update((v) => !v); }
  cerrarMenu(): void { this.menuAbierto.set(false); }

  alternarMenuContraido(): void {
    if (window.innerWidth <= 1024) return;

    const nuevo = !this.menuContraido();
    this.menuContraido.set(nuevo);
    this.estadoContraidoChange.emit(nuevo);

    this.storage.setLocal('kiert-menu-contraido', String(nuevo));
  }

  // ===== NOTIFICACIONES =====
  toggleNotificaciones(): void {
    this.panelNotificacionesAbierto.update(v => !v);
    if (this.panelNotificacionesAbierto()) {
      this.cerrarMenu();
      this.cargarContadorNotificaciones();
    }
  }

  cerrarPanelNotificaciones(): void {
    this.panelNotificacionesAbierto.set(false);
  }

  cargarContadorNotificaciones(): void {
    if (!this.authService.isAuthenticated()) {
      this.notificacionesNoLeidas.set(0);
      return;
    }
    this.notificationService.contarNoLeidas().subscribe({
      next: (n: number) => this.notificacionesNoLeidas.set(n || 0),
      error: () => this.notificacionesNoLeidas.set(0)
    });
  }

  // ===== CHAT =====
  cargarMensajesNoLeidos(): void {
    if (!this.chatPrivadoHabilitado) {
      this.mensajesNoLeidos.set(0);
      return;
    }
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
    if (this.chatPrivadoHabilitado) this.router.navigate(['/chat']);
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

  irAEditarBienvenida(): void {
    this.cerrarMenu();
    if (!this.adminAuth.estaLogueado()) {
      this.router.navigate(['/admin/login']);
      return;
    }
    this.router.navigate(['/admin/bienvenida']);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.cerrarPanelNotificaciones();
    this.adminAuth.logout();
    this.authService.logout();

    this.personalizacionStore.resetear();
    this.storage.resetearPreferencias();
    this.storage.quitarInvitado();

    this.router.navigate(['/login']);
  }

  private restaurarEstadoMenu(): void {
    const guardado = this.storage.getLocal('kiert-menu-contraido') === 'true';
    this.menuContraido.set(guardado);
    this.estadoContraidoChange.emit(guardado);
  }
}