// src/app/shared/components/navbar/navbar.component.ts
import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, NavigationEnd, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { NotificationService } from '../../../core/services/notification.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
// ✅ IMPORTAR EL COMPONENTE DE NOTIFICACIONES
import { NotificacionesComponent } from '../../../features/community/notificaciones/notificaciones.component';

@Component({
  selector: 'kiert-navbar',
  standalone: true,
  imports: [
    RouterLink, 
    RouterLinkActive, 
    CommonModule,
    NotificacionesComponent  // ✅ AÑADIDO
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit, OnDestroy {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  menuAbierto = signal(false);
  mensajesNoLeidos = this.notificationService.mensajesNoLeidos;
  private subscription: Subscription | null = null;
  private intervalId: any = null;

  ngOnInit(): void {
    console.log('🔔 Navbar: Inicializando');
    
    setTimeout(() => {
      this.cargarMensajesNoLeidos();
    }, 100);
    
    this.subscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        console.log('🔔 Navbar: Navegación a:', event.url);
        setTimeout(() => {
          this.actualizarContador();
        }, 200);
      });

    this.intervalId = setInterval(() => {
      this.actualizarContador();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  actualizarContador(): void {
    const url = this.router.url;
    console.log('🔔 Navbar: URL actual:', url);
    
    if (url.includes('/chat')) {
      console.log('🔔 Navbar: En el chat - Reseteando contador');
      this.notificationService.resetearContador();
    } else {
      this.cargarMensajesNoLeidos();
    }
  }

  cargarMensajesNoLeidos(): void {
    if (!this.authService.isAuthenticated()) {
      console.log('🔔 Navbar: Usuario no autenticado');
      this.notificationService.resetearContador();
      return;
    }

    console.log('🔔 Navbar: Cargando conversaciones...');
    this.chatService.listarConversaciones().subscribe({
      next: (conversaciones) => {
        const total = conversaciones.reduce((acc, conv) => acc + conv.noLeidos, 0);
        console.log('🔔 Navbar: Total mensajes no leídos:', total);
        this.notificationService.actualizarContador(total);
      },
      error: (error) => {
        console.error('❌ Navbar: Error al cargar mensajes no leídos:', error);
        this.notificationService.resetearContador();
      }
    });
  }

  irAlChat(): void {
    console.log('🔔 Navbar: Navegando al chat - Reseteando contador');
    this.notificationService.resetearContador();
    this.router.navigate(['/chat']);
  }

  alternarMenu(): void {
    this.menuAbierto.update((valor) => !valor);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.authService.logout();
  }
}