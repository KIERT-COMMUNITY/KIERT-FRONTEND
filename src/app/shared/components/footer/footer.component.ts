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
      title: 'Kiert',
      description: 'Funcionalidades basicas y seguir mejorando',
      image: 'assets/images/anuncio/foto-anuncio.jpg', //  SIN src/ al inicio
      link: 'https://www.instagram.com/kiert_2005?stkn=aG9wZmQyamUzemV5',
      alt: 'Kiert Pro'
    },
    {
      id: 2,
      title: 'Comunidad',
      description: 'Comparte y aprende de otras personas',
      image: 'assets/images/anuncio/foto-anuncio.jpeg',
      link: 'https://www.tiktok.com/@kiert2005?_r=1&_t=ZS-99XPBPKJM7r',
      alt: 'Comunidad Kiert'
    }
  ]);
}