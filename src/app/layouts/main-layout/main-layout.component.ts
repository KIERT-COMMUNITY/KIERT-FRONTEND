// main-layout.component.ts
import { Component, inject, OnInit, effect, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { FloatingSocialComponent } from '../../shared/components/floating-social/floating-social.component';

@Component({
  selector: 'kiert-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, FloatingSocialComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent implements OnInit {
  public personalizacionStore = inject(PersonalizacionStore);

  // Signal para el tema seleccionado
  selectedTheme = this.personalizacionStore.temaId;

  // Computed para el fondo dinámico
  fondoGradiente = computed(() => {
    return this.personalizacionStore.fondoGradiente();
  });

  constructor() {
    // Efecto para actualizar cuando cambie el tema
    effect(() => {
      const themeId = this.personalizacionStore.temaId();
      this.aplicarTemaGlobal(themeId);
    });
  }

  ngOnInit(): void {
    // Aplicar tema al cargar el componente
    const themeId = this.personalizacionStore.temaId();
    this.aplicarTemaGlobal(themeId);
  }

  // Método para obtener el fondo gradiente (usado en el HTML)
  getBackgroundGradient(): string {
    return this.fondoGradiente();
  }

  // ✅ Manejo de error de imagen
  onBannerError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback a SVG si la imagen no existe
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

  private aplicarTemaGlobal(themeId: string): void {
    // Remover atributo data-theme anterior
    document.documentElement.removeAttribute('data-theme');
    
    // Aplicar el nuevo tema
    if (themeId && themeId !== 'default') {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  }
}