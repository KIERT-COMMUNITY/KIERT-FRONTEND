// footer.component.ts -> pie de página simple, se repite en todas las pantallas
// internas (se incluye una sola vez desde main-layout).
import { Component } from '@angular/core';

@Component({
  selector: 'kiert-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  anioActual = new Date().getFullYear(); // se muestra dinámico en el HTML
}
