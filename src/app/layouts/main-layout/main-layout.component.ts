// src/app/layouts/main-layout/main-layout.component.ts
import {
  Component,
  OnInit,
  OnDestroy,
  effect,
  inject,
  signal,
  NgZone,
  ChangeDetectionStrategy
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { FloatingSocialComponent } from '../../shared/components/floating-social/floating-social.component';

import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { KeyboardShortcutsService } from '../../core/services/keyboard-shortcuts.service';
import { safeClassToken } from '../../shared/utils/url-sanitizer';

@Component({
  selector: 'kiert-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    FloatingSocialComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  public readonly personalizacionStore = inject(PersonalizacionStore);
  public readonly shortcuts = inject(KeyboardShortcutsService);

  readonly selectedTheme = this.personalizacionStore.temaId;
  readonly menuContraido = signal(false);
  readonly esRutaChat = signal(false);

  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);

  private readonly destroy$ = new Subject<void>();
  private appHeightListener?: () => void;

  constructor() {
    this.actualizarModoRuta(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.actualizarModoRuta(event.urlAfterRedirects));

    // Tema global reactivo (safe: themeId saneado)
    effect(() => {
      const themeId = this.personalizacionStore.temaId();
      this.aplicarTemaGlobal(themeId);
    });
  }

  ngOnInit(): void {
    this.aplicarTemaGlobal(this.personalizacionStore.temaId());
    this.restaurarEstadoMenu();
    this.setupAppHeight();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.teardownAppHeight();
  }

  actualizarEstadoMenu(estadoContraido: boolean): void {
    this.menuContraido.set(estadoContraido);
  }

  abrirAyudaAtajos(): void {
    this.shortcuts.mostrarAyuda.set(true);
  }

  onBannerError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;

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
          >_ kiert
        </text>
        <text x="50%" y="60%" font-family="Inter, sans-serif" font-size="14" fill="#8b98a5" text-anchor="middle" dy=".3em">
          Comunidad de desarrolladores
        </text>
      </svg>
    `)}`;
  }

  private actualizarModoRuta(url: string): void {
    const rutaSinQuery = url.split('?')[0].split('#')[0];
    this.esRutaChat.set(
      rutaSinQuery === '/chat' || rutaSinQuery.startsWith('/chat/')
    );
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
  // --app-height y --kb-offset EN TIEMPO REAL
  // ============================================================
  private setupAppHeight(): void {
    if (typeof window === 'undefined') return;

    const setHeight = () => {
      const vv = window.visualViewport;
      const h = vv?.height ?? window.innerHeight;
      const offsetTop = vv?.offsetTop ?? 0;

      document.documentElement.style.setProperty('--app-height', `${h}px`);
      document.documentElement.style.setProperty('--vv-height', `${h}px`);

      const bottomInset = Math.max(0, window.innerHeight - h - offsetTop);
      document.documentElement.style.setProperty('--kb-offset', `${bottomInset}px`);
    };

    this.ngZone.runOutsideAngular(() => {
      setHeight();
      window.visualViewport?.addEventListener('resize', setHeight);
      window.visualViewport?.addEventListener('scroll', setHeight);
      window.addEventListener('resize', setHeight);
      window.addEventListener('orientationchange', setHeight);
    });

    this.appHeightListener = setHeight;
  }

  private teardownAppHeight(): void {
    if (typeof window === 'undefined' || !this.appHeightListener) return;

    window.visualViewport?.removeEventListener('resize', this.appHeightListener);
    window.visualViewport?.removeEventListener('scroll', this.appHeightListener);
    window.removeEventListener('resize', this.appHeightListener);
    window.removeEventListener('orientationchange', this.appHeightListener);

    document.documentElement.style.removeProperty('--app-height');
    document.documentElement.style.removeProperty('--vv-height');
    document.documentElement.style.removeProperty('--kb-offset');

    this.appHeightListener = undefined;
  }

  private aplicarTemaGlobal(themeId: string): void {
    if (typeof document === 'undefined') return;

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

    // Saneado: solo [a-z0-9-]
    const tema = safeClassToken(themeId, 'default');

    html.setAttribute('data-theme', tema);
    html.classList.add(`tema-${tema}`);
    body.setAttribute('data-theme', tema);
    body.classList.add(`tema-${tema}`);
  }
}