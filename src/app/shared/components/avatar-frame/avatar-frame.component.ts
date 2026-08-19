import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

@Component({
  selector: 'kiert-avatar-frame',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-frame.component.html',
  styleUrl: './avatar-frame.component.scss',
})
export class AvatarFrameComponent {
  private router = inject(Router);
  private personalizacionStore = inject(PersonalizacionStore);

  @Input() fotoUrl: string | null = null;
  @Input() nombre: string = '';
  @Input() size: number = 48;
  @Input() alt: string = '';
  @Input() navigateToProfile: boolean = false;
  @Input() usuarioId: number | null = null;
  
  // ✅ NUEVO: Recibir el marco específico del autor
  @Input() marcoId: string | null = null;

  getInitials(): string {
    return this.nombre?.charAt(0)?.toUpperCase() || '?';
  }

  // ✅ USAR EL MARCO DEL AUTOR (si se pasa) o el del usuario logueado
  get marcoClase(): string {
    const id = this.marcoId || this.personalizacionStore.marcoId();
    return `frame-${id}`;
  }

  // ✅ ESTILO DEL MARCO
  get marcoEstilo(): any {
    const marcoId = this.marcoId || this.personalizacionStore.marcoId();
    const gradientFrames = ['rainbow', 'pastel', 'ocean', 'sunset', 'galaxy', 'fire', 'ice', 'rose', 'crystal'];
    
    if (gradientFrames.includes(marcoId)) {
      const marcoData = this.personalizacionStore.marcosData().find(m => m.id === marcoId);
      return {
        'border': '4px solid transparent',
        'background-image': marcoData?.gradient || 'none',
        'background-origin': 'border-box',
        'background-clip': 'padding-box, border-box',
        'padding': '4px',
        'box-shadow': this.getMarcoShadow(marcoId),
        'border-radius': '50%',
      };
    }
    
    return {
      'border': this.getMarcoBorder(marcoId),
      'box-shadow': this.getMarcoShadow(marcoId),
      'border-radius': '50%',
    };
  }

  getMarcoBorder(marcoId: string): string {
    const map: Record<string, string> = {
      'none': 'none',
      'classic': '4px solid #2dd4bf',
      'gold': '4px solid #f9ca24',
      'silver': '4px solid #b2bec3',
      'rainbow': '4px solid transparent',
      'pastel': '4px solid transparent',
      'neon': '4px solid #fd79a8',
      'ocean': '4px solid transparent',
      'sunset': '4px solid transparent',
      'galaxy': '4px solid transparent',
      'fire': '4px solid transparent',
      'ice': '4px solid transparent',
      'rose': '4px solid transparent',
      'cyber': '4px solid #00d4ff',
      'crystal': '4px solid rgba(255,255,255,0.3)',
      'double': 'double 6px #f9ca24',
      'star': '4px solid #feca57',
      'moon': '4px solid #dfe6e9',
      'sun': '4px solid #fdcb6e',
      'elite': '4px solid #6c5ce7',
    };
    return map[marcoId] || '4px solid #2dd4bf';
  }

  getMarcoShadow(marcoId: string): string {
    const map: Record<string, string> = {
      'gold': '0 0 25px rgba(249,202,36,0.5)',
      'silver': '0 0 25px rgba(178,190,195,0.4)',
      'rainbow': '0 0 30px rgba(255,107,107,0.4)',
      'pastel': '0 0 30px rgba(253,121,168,0.3)',
      'neon': '0 0 35px rgba(253,121,168,0.6)',
      'ocean': '0 0 30px rgba(0,206,201,0.4)',
      'sunset': '0 0 30px rgba(255,107,107,0.4)',
      'galaxy': '0 0 35px rgba(108,92,231,0.5)',
      'fire': '0 0 35px rgba(255,107,107,0.6)',
      'ice': '0 0 35px rgba(90,184,216,0.5)',
      'rose': '0 0 30px rgba(253,121,168,0.5)',
      'cyber': '0 0 40px rgba(0,212,255,0.6)',
      'crystal': '0 0 40px rgba(255,255,255,0.2)',
      'double': '0 0 35px rgba(249,202,36,0.5)',
      'star': '0 0 30px rgba(254,202,87,0.4)',
      'moon': '0 0 25px rgba(223,230,233,0.3)',
      'sun': '0 0 30px rgba(253,203,110,0.4)',
      'elite': '0 0 40px rgba(108,92,231,0.6)',
    };
    return map[marcoId] || 'none';
  }

  navigateToProfileClick(event: Event): void {
    event.stopPropagation();
    if (this.navigateToProfile && this.usuarioId) {
      this.router.navigate(['/usuario', this.usuarioId]);
    }
  }

  // ✅ ESTILO DEL CONTENEDOR
  get containerStyle(): any {
    return {
      'width': this.size + 'px',
      'height': this.size + 'px',
      'flex-shrink': '0',
    };
  }

  // ✅ TAMAÑO DE LA IMAGEN DENTRO DEL MARCO
  get imageSize(): number {
    return this.size - 8;
  }
}