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

  private aplicarTemaGlobal(themeId: string): void {
    // Remover atributo data-theme anterior
    document.documentElement.removeAttribute('data-theme');
    
    // Aplicar el nuevo tema
    if (themeId && themeId !== 'default') {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  }
}