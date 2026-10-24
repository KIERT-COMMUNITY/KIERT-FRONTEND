// src/app/shared/components/footer/footer.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kiert-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  anioActual = new Date().getFullYear();

  footerAds = signal([
    {
      id: 1,
      title: 'Kiert',
      description: 'Funcionalidades básicas y seguir mejorando',
      image: 'assets/images/anuncio/kietlimpiado.png',
      link: 'https://www.instagram.com/kiert_2005?stkn=aG9wZmQyamUzemV5',
      alt: 'Kiert Pro'
    },
    {
      id: 2,
      title: 'Comunidad',
      description: 'Comparte y aprende de otras personas',
      image: 'assets/images/anuncio/kietlimpiado.png',
      link: 'https://www.tiktok.com/@kiert2005?_r=1&_t=ZS-9AlvehRZqy2',
      alt: 'Comunidad Kiert'
    }
  ]);
}