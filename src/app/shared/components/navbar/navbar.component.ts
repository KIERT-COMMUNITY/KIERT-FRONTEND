// navbar.component.ts -> barra superior, visible en toda la comunidad.
// Contiene el menú hamburguesa para celular (RF pedido explícitamente).
import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  // signal booleano: controla si el menú está abierto en pantallas chicas
  menuAbierto = signal(false);

  constructor(public auth: AuthService) {}

  alternarMenu(): void {
    this.menuAbierto.update((valor) => !valor); // invierte true/false
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false); // se llama al hacer click en un link, para que el menú se cierre solo
  }

  cerrarSesion(): void {
    this.auth.logout();
  }
}
