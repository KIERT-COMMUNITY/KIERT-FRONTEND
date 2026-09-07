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
  
  // Anuncios del footer - CORREGIDO
  footerAds = signal([
    {
      id: 1,
      title: 'Kiert Pro',
      description: 'Funcionalidades exclusivas para profesionales',
      image: 'assets/images/anuncio/foto-anuncio.jpg', // ✅ SIN src/ al inicio
      link: '#',
      alt: 'Kiert Pro'
    },
    {
      id: 2,
      title: 'Comunidad',
      description: 'Comparte y aprende con otros desarrolladores',
      image: 'assets/images/anuncio/foto-anuncio.jpeg',
      link: '#',
      alt: 'Comunidad Kiert'
    }
  ]);
}