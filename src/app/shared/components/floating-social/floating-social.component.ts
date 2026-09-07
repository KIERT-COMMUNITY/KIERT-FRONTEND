// src/app/shared/components/floating-social/floating-social.component.ts
import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeHtmlPipe } from '../../pipes/safe.html.pipe';

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
  bgColor: string;
  iconColor: string;
}

export interface StaticAd {
  id: number;
  image: string;
  link: string;
  alt: string;
}

@Component({
  selector: 'kiert-floating-social',
  standalone: true,
  imports: [CommonModule, SafeHtmlPipe],
  templateUrl: './floating-social.component.html',
  styleUrl: './floating-social.component.scss',
})
export class FloatingSocialComponent implements OnInit {
  // ===== CARRUSEL DE ANUNCIOS ESTÁTICOS =====
  showStaticAd = signal(true);
  indiceActual = signal(0);

  staticAds = signal<StaticAd[]>([
    {
      id: 1,
      image: 'assets/images/frase-anuncio/frase.jpg',
      link: 'http://localhost:4200/#/',
      alt: 'Anuncio 1 - Kiert'
    },
    {
      id: 2,
      image: 'assets/images/frase-anuncio/anunci1.jpg',
      link: 'https://www.facebook.com/confecciones.herliz/',
      alt: 'Anuncio 2 - Kiert'
    },
    {
      id: 3,
      image: 'assets/images/frase-anuncio/anuncio2.jpg',
      link: 'https://www.facebook.com/cykaconfeccion/?locale=es_LA',
      alt: 'Anuncio 3 - Kiert'
    },
    {
      id: 4,
      image: 'assets/images/frase-anuncio/anuncio3.jpg',
      link: 'https://www.ecosia.org/',
      alt: 'Anuncio 4 - Kiert'
    },
    {
      id: 5,
      image: 'assets/images/frase-anuncio/anuncio4.jpg',
      link: 'https://www.karnilcorp.com/index.html',
      alt: 'Anuncio 5 - Kiert'
    },
     {
      id: 6,
      image: 'assets/images/frase-anuncio/anuncio5.jpg',
      link: 'https://www.karnilcorp.com/index.html',
      alt: 'Anuncio 5 - Kiert'
    }
  ]);

  // ===== OTROS ANUNCIOS =====
  showTopAd = signal(true);
  showBottomAd = signal(true);
  showPopUp = signal(false);
  showBanner = signal(true);

  private popUpTimer: any;

  ngOnInit(): void {
    this.popUpTimer = setTimeout(() => {
      this.showPopUp.set(true);
    }, 3000);
  }

  // ===== MÉTODOS DEL CARRUSEL =====

  siguiente(): void {
    const total = this.staticAds().length;
    const nuevoIndice = (this.indiceActual() + 1) % total;
    this.indiceActual.set(nuevoIndice);
  }

  anterior(): void {
    const total = this.staticAds().length;
    const nuevoIndice = (this.indiceActual() - 1 + total) % total;
    this.indiceActual.set(nuevoIndice);
  }

  irAlIndice(indice: number): void {
    if (indice >= 0 && indice < this.staticAds().length) {
      this.indiceActual.set(indice);
    }
  }

  closeStaticAd(): void {
    this.showStaticAd.set(false);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="250" viewBox="0 0 200 250"%3E%3Crect width="200" height="250" fill="%231b232c"/%3E%3Ctext x="50%25" y="50%25" font-family="Arial" font-size="14" fill="%232dd4bf" text-anchor="middle" dy=".3em"%3EAnuncio%3C/text%3E%3C/svg%3E';
  }

  // ===== MÉTODOS PARA OTROS ANUNCIOS =====
  closeTopAd(): void {
    this.showTopAd.set(false);
  }

  closeBottomAd(): void {
    this.showBottomAd.set(false);
  }

  closePopUp(): void {
    this.showPopUp.set(false);
  }

  closeBanner(): void {
    this.showBanner.set(false);
  }

  // ===== REDES SOCIALES =====
  socialLinks = signal<SocialLink[]>([
    {
      id: 'github',
      name: 'GitHub',
      url: 'https://github.com/tu-usuario',
      icon: this.getGitHubIcon(),
      bgColor: '#ffffff',
      iconColor: '#24292e'
    },
    {
      id: 'discord',
      name: 'Discord',
      url: 'https://discord.gg/tu-invite',
      icon: this.getDiscordIcon(),
      bgColor: '#ffffff',
      iconColor: '#5865F2'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      url: 'https://linkedin.com/in/tu-perfil',
      icon: this.getLinkedInIcon(),
      bgColor: '#ffffff',
      iconColor: '#0A66C2'
    },
    {
      id: 'facebook',
      name: 'Facebook',
      url: 'https://facebook.com/tu-pagina',
      icon: this.getFacebookIcon(),
      bgColor: '#ffffff',
      iconColor: '#1877F2'
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      url: 'https://tiktok.com/@tu-usuario',
      icon: this.getTikTokIcon(),
      bgColor: '#ffffff',
      iconColor: '#000000'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      url: 'https://instagram.com/tu-usuario',
      icon: this.getInstagramIcon(),
      bgColor: '#ffffff',
      iconColor: '#E4405F'
    },
    {
      id: 'youtube',
      name: 'YouTube',
      url: 'https://youtube.com/@tu-canal',
      icon: this.getYouTubeIcon(),
      bgColor: '#ffffff',
      iconColor: '#FF0000'
    },
    {
      id: 'twitch',
      name: 'Twitch',
      url: 'https://twitch.tv/tu-usuario',
      icon: this.getTwitchIcon(),
      bgColor: '#ffffff',
      iconColor: '#9146FF'
    }
  ]);

  // ===== ICONOS SVG =====

  private getGitHubIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#24292e"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`;
  }

  private getDiscordIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 005.994-3.03.078.078 0 00.03-.057c.5-5.093-.838-9.62-3.549-13.66a.061.061 0 00-.031-.027zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`;
  }

  private getLinkedInIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`;
  }

  private getFacebookIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`;
  }

  private getTikTokIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#000000"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.76-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
  }

  private getInstagramIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#E4405F"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`;
  }

  private getYouTubeIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
  }

  private getTwitchIcon(): string {
    return `<svg viewBox="0 0 24 24" fill="#9146FF"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`;
  }
}