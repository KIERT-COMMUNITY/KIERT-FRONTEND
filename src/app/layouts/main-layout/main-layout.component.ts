// main-layout.component.ts -> "molde" visual de todas las páginas internas
// de la comunidad: Navbar arriba + contenido de la ruta + Footer abajo.
// Así cada página (feed, perfil, chat...) solo se preocupa de SU contenido.
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';

@Component({
  selector: 'kiert-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  public personalizacionStore = inject(PersonalizacionStore);
}