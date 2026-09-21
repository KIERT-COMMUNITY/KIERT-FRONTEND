// src/app/shared/layouts/main-layout/main-layout.component.ts
import {
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal
} from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { FloatingSocialComponent } from '../../shared/components/floating-social/floating-social.component';

@Component({
  selector: 'kiert-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    FloatingSocialComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent implements OnInit {
  public readonly personalizacionStore = inject(PersonalizacionStore);

  readonly selectedTheme = this.personalizacionStore.temaId;
  readonly menuContraido = signal(false);

  //  El fondo del PERFIL no se aplica aquí, se aplica en la tarjeta del perfil.
  // Aquí no necesitamos exponerlo.

  constructor() {
    //  Aplicar tema global cada vez que cambie el temaId
    effect(() => {
      const themeId = this.personalizacionStore.temaId();
      this.aplicarTemaGlobal(themeId);
    });
  }

  ngOnInit(): void {
    const themeId = this.personalizacionStore.temaId();
    this.aplicarTemaGlobal(themeId);
    this.restaurarEstadoMenu();
  }

  actualizarEstadoMenu(estadoContraido: boolean): void {
    this.menuContraido.set(estadoContraido);
  }

  onBannerError(event: Event): void {
    const img = event.target as HTMLImageElement;

    img.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="200">
        <defs>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0d1117"/>
            <stop offset="100%" stop-color="#1b232c"/>
          </linearGradient>
          <linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#17b6a4" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        <rect width="1200" height="200" fill="url(#g)"/>
        <rect width="1200" height="200" fill="url(#a)" opacity="0.3"/>
        <text x="50%" y="50%" font-family="JetBrains Mono, monospace" font-size="28" fill="#e6edf3" text-anchor="middle" dy=".3em">
          &gt;_ kiert
        </text>
        <text x="50%" y="60%" font-family="Inter, sans-serif" font-size="14" fill="#8b98a5" text-anchor="middle" dy=".3em">
          Comunidad de desarrolladores
        </text>
      </svg>
    `)}`;
  }

  private restaurarEstadoMenu(): void {
    try {
      this.menuContraido.set(
        localStorage.getItem('kiert-menu-contraido') === 'true'
      );
    } catch {
      this.menuContraido.set(false);
    }
  }

  // ============================================================
  //  APLICAR TEMA GLOBAL (fondo de página + color de letras)
  // ============================================================
  private aplicarTemaGlobal(themeId: string): void {
    const html = document.documentElement;
    const body = document.body;

    const limpiar = (el: HTMLElement) => {
      el.removeAttribute('data-theme');
      Array.from(el.classList)
        .filter(c => c.startsWith('tema-'))
        .forEach(c => el.classList.remove(c));
    };

    limpiar(html);
    limpiar(body);

    const tema = themeId && themeId !== 'default' ? themeId : 'default';

    html.setAttribute('data-theme', tema);
    html.classList.add(`tema-${tema}`);
    body.setAttribute('data-theme', tema);
    body.classList.add(`tema-${tema}`);

    console.log(' Tema global aplicado:', tema);
  }
}