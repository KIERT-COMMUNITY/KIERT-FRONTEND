// footer.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'kiert-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  anioActual = new Date().getFullYear();
}