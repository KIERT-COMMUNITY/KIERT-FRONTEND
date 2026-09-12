import { Component, signal, inject, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';

@Component({
  selector: 'kiert-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, NotificacionesComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private router = inject(Router);

  menuAbierto = signal(false);
  mensajesNoLeidos = signal(0);
  private intervalId: any = null;

  ngOnInit(): void {
    this.cargarMensajesNoLeidos();
    this.intervalId = setInterval(() => this.cargarMensajesNoLeidos(), 30000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuAbierto()) this.cerrarMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1024 && this.menuAbierto()) {
      this.menuAbierto.set(false);
    }
  }

  alternarMenu(): void {
    this.menuAbierto.update(val => !val);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cargarMensajesNoLeidos(): void {
    if (!this.authService.isAuthenticated()) return;
    this.chatService.obtenerMensajesNoLeidos().subscribe({
      next: (count: number) => this.mensajesNoLeidos.set(count || 0),
      error: () => {}
    });
  }

  irAlChat(): void {
    this.cerrarMenu();
    this.router.navigate(['/chat']);
  }

  cerrarSesion(): void {
    this.cerrarMenu();
    // ⚠️ Cambia 'logout' por el método real de tu AuthService
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}