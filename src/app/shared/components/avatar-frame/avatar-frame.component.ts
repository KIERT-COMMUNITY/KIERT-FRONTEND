import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { Marco } from '../../../core/services/personalizacion.service';

@Component({
  selector: 'kiert-avatar-frame',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div 
      class="avatar-frame" 
      [class]="frameClase()"
      [style.width.px]="size" 
      [style.height.px]="size"
      [style.border-image]="frameBorderImage()"
      [style.border-image-slice]="'30'"
      [style.border-image-width]="'8px'"
      [style.border-style]="'solid'"
      [style.border-color]="'transparent'"
      [routerLink]="navigateToProfile ? ['/usuario', usuarioId] : null"
      (click)="$event.stopPropagation()"
      [title]="nombre"
    >
      @if (fotoUrl) {
        <img 
          [src]="fotoUrl" 
          [alt]="alt" 
          [style.width.px]="size" 
          [style.height.px]="size"
          (error)="onError($event)"
        >
      } @else {
        <span class="avatar-initial" [style.fontSize.px]="size * 0.4">
          {{ iniciales() }}
        </span>
      }
    </div>
  `,
  styles: [`
    .avatar-frame {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      background: linear-gradient(135deg, #2dd4bf, #17b6a4);
      transition: all 0.3s ease;
      cursor: pointer;
      position: relative;
    }
    .avatar-frame img {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
    .avatar-frame .avatar-initial {
      font-weight: 700;
      color: #0d1117;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }
    .avatar-frame:hover {
      transform: scale(1.05);
      z-index: 10;
    }
    /* Tipos de marco */
    .avatar-frame.circulo { border-radius: 50%; }
    .avatar-frame.cuadrado { border-radius: 8px; }
    .avatar-frame.hexagonal {
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    }
    /* Estilos de marcos - NINGUNO, TODOS VISIBLES */
    .avatar-frame.frame-none { border: none; }
    .avatar-frame.frame-classic { border: 3px solid #2dd4bf; }
    .avatar-frame.frame-gold { border: 3px solid #f9ca24; }
    .avatar-frame.frame-silver { border: 3px solid #b2bec3; }
    .avatar-frame.frame-rainbow { 
      border: 3px solid transparent;
      background-image: linear-gradient(135deg, #ff6b6b, #feca57, #55efc4, #0984e3, #6c5ce7);
      background-origin: border-box;
      background-clip: padding-box, border-box;
      padding: 2px;
    }
    .avatar-frame.frame-neon { 
      border: 3px solid #fd79a8;
      box-shadow: 0 0 20px rgba(253, 121, 168, 0.4);
    }
    .avatar-frame.frame-square { border-radius: 8px !important; }
    .avatar-frame.frame-hexagon {
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    }
  `]
})
export class AvatarFrameComponent {
  private personalizacionStore = inject(PersonalizacionStore);

  @Input() fotoUrl: string | null = null;
  @Input() nombre: string = '';
  @Input() size: number = 48;
  @Input() alt: string = 'Avatar';
  @Input() marcoOverride: string | null = null;
  @Input() navigateToProfile: boolean = false;
  @Input() usuarioId: number | null = null;

  // Usar el marco del store o uno específico
  readonly marcoId = computed(() => {
    return this.marcoOverride || this.personalizacionStore.marcoId();
  });

  readonly frameClase = computed(() => {
    const id = this.marcoId();
    console.log('🔲 AvatarFrame - marcoId:', id, 'clase: frame-' + id);
    return `frame-${id}`;
  });

  readonly frameBorderImage = computed(() => {
    const marco = this.personalizacionStore.marcos().find((m: Marco) => m.id === this.marcoId());
    if (marco?.urlImagen) {
      return `url(${marco.urlImagen}) 30 stretch`;
    }
    return 'none';
  });

  iniciales = computed(() => {
    return this.nombre?.charAt(0)?.toUpperCase() || '?';
  });

  onError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}