// src/app/layouts/admin-layout/navbar-admin/navbar-admin.component.ts
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
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { StorageService } from '../../../core/services/storage.service';
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';

@Component({
  selector: 'kiert-navbar-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificacionesComponent],
  templateUrl: './navbar-admin.component.html',
  styleUrl: './navbar-admin.component.scss'
})
export class NavbarAdminComponent implements OnInit, OnDestroy {
  @Output() estadoContraidoChange = new EventEmitter<boolean>();

  private readonly adminAuth = inject(AdminAuthService);
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly storage = inject(StorageService);
  private readonly router = inject(Router);

  public readonly auth = this.adminAuth;

  readonly menuAbierto = signal(false);
  readonly menuContraido = signal(false);
  readonly mensajesNoLeidos = signal(0);

  private readonly STORAGE_KEY = 'kiert-admin-menu-contraido';
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

  alternarMenu(): void { this.menuAbierto.update((v) => !v); }
  cerrarMenu(): void { this.menuAbierto.set(false); }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) this.cerrarMenu();
  }

  alternarMenuContraido(): void {
    if (window.innerWidth <= 1024) return;
    const nuevo = !this.menuContraido();
    this.menuContraido.set(nuevo);
    this.estadoContraidoChange.emit(nuevo);
    this.storage.setLocal(this.STORAGE_KEY, String(nuevo));
  }

  private restaurarEstadoMenu(): void {
    const guardado = this.storage.getLocal(this.STORAGE_KEY) === 'true';
    this.menuContraido.set(guardado);
    this.estadoContraidoChange.emit(guardado);
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

  irAlPerfil(): void {
    this.cerrarMenu();
    this.router.navigate(['/perfil']);
  }

  irAAjustes(): void {
    this.cerrarMenu();
    this.router.navigate(['/ajustes']);
  }

  irAlSitio(): void {
    this.cerrarMenu();
    this.router.navigate(['/comunidad']);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    this.adminAuth.logout();
    this.router.navigate(['/admin/login']);
  }
}