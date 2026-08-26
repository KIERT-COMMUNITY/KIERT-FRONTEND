// footer.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  anioActual = new Date().getFullYear();
  
  // Anuncios del footer
  footerAds = signal([
    {
      id: 1,
      title: 'Kiert Pro',
      description: 'Funcionalidades exclusivas para profesionales',
      image: 'https://via.placeholder.com/300x150/2dd4bf/0d1117?text=Kiert+Pro',
      link: '#',
      alt: 'Kiert Pro'
    },
    {
      id: 2,
      title: 'Comunidad',
      description: 'Comparte y aprende con otros desarrolladores',
      image: 'https://via.placeholder.com/300x150/6c5ce7/0d1117?text=Comunidad',
      link: '#',
      alt: 'Comunidad Kiert'
    }
  ]);
}