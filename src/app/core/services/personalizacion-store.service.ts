import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { PersonalizacionService, Personalizacion, Marco, Fondo } from './personalizacion.service';
import { AuthService } from './auth.service';

export interface ColorTheme {
  id: string;
  name: string;
  colors: string[];
  gradient: string;
  isFree: boolean;
}

export interface MarcoItem {
  id: string;
  name: string;
  borderColor: string;
  borderStyle: string;
  shadow: string;
  clipPath: string;
  gradient: string;
  isFree: boolean;
  description: string;
}

export interface FondoItem {
  id: string;
  name: string;
  gradient: string;
  isFree: boolean;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class PersonalizacionStore {
  private personalizacionService = inject(PersonalizacionService);
  private authService = inject(AuthService);

  private personalizacionSignal = signal<Personalizacion | null>(null);
  private marcosSignal = signal<Marco[]>([]);
  private fondosSignal = signal<Fondo[]>([]);
  private loadingSignal = signal(false);

  // ===== SIGNALS PRINCIPALES =====
  readonly personalizacion = computed(() => this.personalizacionSignal());
  readonly marcos = computed(() => this.marcosSignal());
  readonly fondos = computed(() => this.fondosSignal());
  readonly loading = computed(() => this.loadingSignal());

  readonly temaId = computed(() => this.personalizacionSignal()?.temaId || 'default');
  readonly marcoId = computed(() => this.personalizacionSignal()?.marcoId || 'none');
  readonly fondoId = computed(() => this.personalizacionSignal()?.fondoId || 'default');
  readonly fotoPerfil = computed(() => this.personalizacionSignal()?.fotoPerfilUrl || '');

  // ===== TEMA CSS =====
  readonly temaClass = computed(() => `tema-${this.temaId()}`);

  // ===== FONDO DE PERFIL =====
  readonly fondoGradiente = computed(() => {
    const fondo = this.fondosSignal().find(f => f.id === this.fondoId());
    return fondo?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  });

  // ===== MARCO - CLASE =====
  readonly marcoClase = computed(() => `frame-${this.marcoId()}`);

  // ===== MARCO - BORDER STYLE =====
  readonly marcoBorderStyle = computed(() => {
    const id = this.marcoId();
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
    return map[id] || '4px solid #2dd4bf';
  });

  // ===== MARCO - SHADOW =====
  readonly marcoShadowStyle = computed(() => {
    const id = this.marcoId();
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
    return map[id] || 'none';
  });

  // ===== MARCO - GRADIENTE =====
  readonly marcoGradientStyle = computed(() => {
    const id = this.marcoId();
    const map: Record<string, string> = {
      'rainbow': 'linear-gradient(135deg, #ff6b6b, #feca57, #55efc4, #0984e3, #6c5ce7)',
      'pastel': 'linear-gradient(135deg, #fd79a8, #fdcb6e, #a29bfe, #55efc4)',
      'ocean': 'linear-gradient(135deg, #00b894, #00cec9, #0984e3)',
      'sunset': 'linear-gradient(135deg, #ff6b6b, #feca57, #fd79a8)',
      'galaxy': 'linear-gradient(135deg, #2d3436, #6c5ce7, #fd79a8)',
      'fire': 'linear-gradient(135deg, #ff6b6b, #e17055, #d63031)',
      'ice': 'linear-gradient(135deg, #74b9ff, #0984e3, #00cec9)',
      'rose': 'linear-gradient(135deg, #fd79a8, #fdcb6e, #f9ca24)',
      'crystal': 'linear-gradient(135deg, #dfe6e9, #b2bec3, #dfe6e9)',
    };
    return map[id] || 'none';
  });

  // ===== MARCO - PADDING =====
  readonly marcoPaddingStyle = computed(() => {
    const gradientFrames = ['rainbow', 'pastel', 'ocean', 'sunset', 'galaxy', 'fire', 'ice', 'rose', 'crystal'];
    return gradientFrames.includes(this.marcoId()) ? '4px' : '0px';
  });

  // ===== MARCO - ESTILO COMPLETO =====
  readonly marcoEstilo = computed(() => {
    const id = this.marcoId();
    const gradientFrames = ['rainbow', 'pastel', 'ocean', 'sunset', 'galaxy', 'fire', 'ice', 'rose', 'crystal'];
    
    if (gradientFrames.includes(id)) {
      return {
        'border': '4px solid transparent',
        'background-image': this.marcoGradientStyle(),
        'background-origin': 'border-box',
        'background-clip': 'padding-box, border-box',
        'padding': '4px',
        'box-shadow': this.marcoShadowStyle(),
        'border-radius': '50%',
      };
    }
    
    return {
      'border': this.marcoBorderStyle(),
      'box-shadow': this.marcoShadowStyle(),
      'border-radius': '50%',
    };
  });

  // ===== TEMAS DE COLOR =====
  readonly colorThemes = signal<ColorTheme[]>([
    { id: 'default', name: 'Default', colors: ['#2dd4bf', '#0d1117'], gradient: 'linear-gradient(135deg, #2dd4bf, #0d1117)', isFree: true },
    { id: 'dark', name: 'Dark', colors: ['#a29bfe', '#1a1a2e'], gradient: 'linear-gradient(135deg, #a29bfe, #1a1a2e)', isFree: true },
    { id: 'light', name: 'Light', colors: ['#2dd4bf', '#ffffff'], gradient: 'linear-gradient(135deg, #2dd4bf, #ffffff)', isFree: true },
    { id: 'sunset', name: 'Sunset', colors: ['#ff6b6b', '#feca57', '#fd79a8'], gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #fd79a8)', isFree: true },
    { id: 'ocean', name: 'Ocean', colors: ['#00b894', '#00cec9', '#0984e3'], gradient: 'linear-gradient(135deg, #00b894, #00cec9, #0984e3)', isFree: true },
    { id: 'aurora', name: 'Aurora', colors: ['#6c5ce7', '#00b894', '#fdcb6e'], gradient: 'linear-gradient(135deg, #6c5ce7, #00b894, #fdcb6e)', isFree: true },
    { id: 'galaxy', name: 'Galaxy', colors: ['#2d3436', '#6c5ce7', '#fd79a8'], gradient: 'linear-gradient(135deg, #2d3436, #6c5ce7, #fd79a8)', isFree: true },
    { id: 'lava', name: 'Lava', colors: ['#ff6b6b', '#e17055', '#d63031'], gradient: 'linear-gradient(135deg, #ff6b6b, #e17055, #d63031)', isFree: true },
    { id: 'forest', name: 'Forest', colors: ['#00b894', '#55efc4', '#00cec9'], gradient: 'linear-gradient(135deg, #00b894, #55efc4, #00cec9)', isFree: true },
    { id: 'candy', name: 'Candy', colors: ['#fd79a8', '#fdcb6e', '#a29bfe'], gradient: 'linear-gradient(135deg, #fd79a8, #fdcb6e, #a29bfe)', isFree: true },
    { id: 'cyber', name: 'Cyber', colors: ['#00d4ff', '#6c5ce7', '#fd79a8'], gradient: 'linear-gradient(135deg, #00d4ff, #6c5ce7, #fd79a8)', isFree: true },
    { id: 'blood', name: 'Blood', colors: ['#ff0044', '#d63031', '#ff6b6b'], gradient: 'linear-gradient(135deg, #ff0044, #d63031, #ff6b6b)', isFree: true },
    { id: 'royal', name: 'Royal', colors: ['#6c5ce7', '#a29bfe', '#fd79a8'], gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe, #fd79a8)', isFree: true },
    { id: 'gold', name: 'Gold', colors: ['#f9ca24', '#fdcb6e', '#feca57'], gradient: 'linear-gradient(135deg, #f9ca24, #fdcb6e, #feca57)', isFree: true },
    { id: 'pastel', name: 'Pastel', colors: ['#fd79a8', '#a29bfe', '#55efc4'], gradient: 'linear-gradient(135deg, #fd79a8, #a29bfe, #55efc4)', isFree: true },
    { id: 'neon', name: 'Neon', colors: ['#fd79a8', '#00d4ff', '#f9ca24'], gradient: 'linear-gradient(135deg, #fd79a8, #00d4ff, #f9ca24)', isFree: true },
  ]);

  // ===== MARCOS =====
  readonly marcosData = signal<MarcoItem[]>([
    { id: 'none', name: 'Sin marco', borderColor: 'transparent', borderStyle: 'none', shadow: 'none', clipPath: 'none', gradient: 'none', isFree: true, description: 'Sin marco' },
    { id: 'classic', name: 'Classic', borderColor: '#2dd4bf', borderStyle: '4px solid #2dd4bf', shadow: 'none', clipPath: 'none', gradient: 'none', isFree: true, description: 'Borde elegante' },
    { id: 'gold', name: 'Gold', borderColor: '#f9ca24', borderStyle: '4px solid #f9ca24', shadow: '0 0 25px rgba(249,202,36,0.5)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Brillo dorado' },
    { id: 'silver', name: 'Silver', borderColor: '#b2bec3', borderStyle: '4px solid #b2bec3', shadow: '0 0 25px rgba(178,190,195,0.4)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Elegancia plateada' },
    { id: 'rainbow', name: 'Rainbow', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 30px rgba(255,107,107,0.4)', clipPath: 'none', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #55efc4, #0984e3, #6c5ce7)', isFree: true, description: 'Colores arcoíris' },
    { id: 'pastel', name: 'Pastel', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 30px rgba(253,121,168,0.3)', clipPath: 'none', gradient: 'linear-gradient(135deg, #fd79a8, #fdcb6e, #a29bfe, #55efc4)', isFree: true, description: 'Tonos suaves' },
    { id: 'neon', name: 'Neon', borderColor: '#fd79a8', borderStyle: '4px solid #fd79a8', shadow: '0 0 35px rgba(253,121,168,0.6)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Brillo neón' },
    { id: 'ocean', name: 'Ocean', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 30px rgba(0,206,201,0.4)', clipPath: 'none', gradient: 'linear-gradient(135deg, #00b894, #00cec9, #0984e3)', isFree: true, description: 'Profundidad marina' },
    { id: 'sunset', name: 'Sunset', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 30px rgba(255,107,107,0.4)', clipPath: 'none', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #fd79a8)', isFree: true, description: 'Atardecer cálido' },
    { id: 'galaxy', name: 'Galaxy', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 35px rgba(108,92,231,0.5)', clipPath: 'none', gradient: 'linear-gradient(135deg, #2d3436, #6c5ce7, #fd79a8)', isFree: true, description: 'Universo infinito' },
    { id: 'fire', name: 'Fire', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 35px rgba(255,107,107,0.6)', clipPath: 'none', gradient: 'linear-gradient(135deg, #ff6b6b, #e17055, #d63031)', isFree: true, description: 'Llamas ardientes' },
    { id: 'ice', name: 'Ice', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 35px rgba(90,184,216,0.5)', clipPath: 'none', gradient: 'linear-gradient(135deg, #74b9ff, #0984e3, #00cec9)', isFree: true, description: 'Frescura glacial' },
    { id: 'rose', name: 'Rose', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 30px rgba(253,121,168,0.5)', clipPath: 'none', gradient: 'linear-gradient(135deg, #fd79a8, #fdcb6e, #f9ca24)', isFree: true, description: 'Rosa dorado' },
    { id: 'cyber', name: 'Cyber', borderColor: '#00d4ff', borderStyle: '4px solid #00d4ff', shadow: '0 0 40px rgba(0,212,255,0.6)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Futurista brillante' },
    { id: 'crystal', name: 'Crystal', borderColor: 'transparent', borderStyle: '4px solid transparent', shadow: '0 0 40px rgba(255,255,255,0.2)', clipPath: 'none', gradient: 'linear-gradient(135deg, #dfe6e9, #b2bec3, #dfe6e9)', isFree: true, description: 'Transparencia pura' },
    { id: 'double', name: 'Double Gold', borderColor: '#f9ca24', borderStyle: 'double 6px #f9ca24', shadow: '0 0 35px rgba(249,202,36,0.5)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Doble lujo dorado' },
    { id: 'star', name: 'Star', borderColor: '#feca57', borderStyle: '4px solid #feca57', shadow: '0 0 30px rgba(254,202,87,0.4)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Brillo estelar' },
    { id: 'moon', name: 'Moon', borderColor: '#dfe6e9', borderStyle: '4px solid #dfe6e9', shadow: '0 0 25px rgba(223,230,233,0.3)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Luz plateada' },
    { id: 'sun', name: 'Sun', borderColor: '#fdcb6e', borderStyle: '4px solid #fdcb6e', shadow: '0 0 30px rgba(253,203,110,0.4)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Brillo solar' },
    { id: 'elite', name: 'Elite', borderColor: '#6c5ce7', borderStyle: '4px solid #6c5ce7', shadow: '0 0 40px rgba(108,92,231,0.6)', clipPath: 'none', gradient: 'none', isFree: true, description: 'Premium real' },
  ]);

  // ===== FONDOS =====
  readonly fondosData = signal<FondoItem[]>([
    { id: 'default', name: 'Default', gradient: 'linear-gradient(135deg, #0d1117, #161b22)', isFree: true, description: 'Estilo clásico' },
    { id: 'dark', name: 'Dark', gradient: 'linear-gradient(135deg, #1a1a2e, #0d1117)', isFree: true, description: 'Elegante oscuridad' },
    { id: 'light', name: 'Light', gradient: 'linear-gradient(135deg, #ffffff, #f0f0f0)', isFree: true, description: 'Limpio y moderno' },
    { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #fd79a8)', isFree: true, description: 'Cálidos tonos' },
    { id: 'ocean', name: 'Ocean', gradient: 'linear-gradient(135deg, #00b894, #00cec9, #0984e3)', isFree: true, description: 'Profundidad marina' },
    { id: 'aurora', name: 'Aurora', gradient: 'linear-gradient(135deg, #6c5ce7, #00b894, #fdcb6e)', isFree: true, description: 'Colores místicos' },
    { id: 'galaxy', name: 'Galaxy', gradient: 'linear-gradient(135deg, #2d3436, #6c5ce7, #fd79a8)', isFree: true, description: 'Universo espacial' },
    { id: 'lava', name: 'Lava', gradient: 'linear-gradient(135deg, #ff6b6b, #e17055, #d63031)', isFree: true, description: 'Fuego ardiente' },
    { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #00b894, #55efc4, #00cec9)', isFree: true, description: 'Naturaleza viva' },
    { id: 'candy', name: 'Candy', gradient: 'linear-gradient(135deg, #fd79a8, #fdcb6e, #a29bfe)', isFree: true, description: 'Dulce colorido' },
    { id: 'cyber', name: 'Cyber', gradient: 'linear-gradient(135deg, #00d4ff, #6c5ce7, #fd79a8)', isFree: true, description: 'Futurista brillante' },
    { id: 'blood', name: 'Blood', gradient: 'linear-gradient(135deg, #ff0044, #d63031, #ff6b6b)', isFree: true, description: 'Rojo intenso' },
    { id: 'royal', name: 'Royal', gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe, #fd79a8)', isFree: true, description: 'Azul real' },
    { id: 'gold', name: 'Gold', gradient: 'linear-gradient(135deg, #f9ca24, #fdcb6e, #feca57)', isFree: true, description: 'Dorado brillante' },
    { id: 'pastel', name: 'Pastel', gradient: 'linear-gradient(135deg, #fd79a8, #a29bfe, #55efc4)', isFree: true, description: 'Tonos suaves' },
  ]);

  // ===== MÉTODOS PÚBLICOS =====
  constructor() {
    effect(() => {
      const usuario = this.authService.usuario();
      if (usuario) {
        this.cargarTodos();
      }
    });
  }

  cargarTodos(): void {
    this.loadingSignal.set(true);
    this.cargarPersonalizacion();
    this.cargarMarcos();
    this.cargarFondos();
    setTimeout(() => this.loadingSignal.set(false), 800);
  }

  cargarPersonalizacion(): void {
    this.personalizacionService.obtenerPersonalizacion().subscribe({
      next: (data) => {
        this.personalizacionSignal.set(data);
        const usuario = this.authService.usuario();
        if (usuario && data.fotoPerfilUrl && usuario.fotoPerfilUrl !== data.fotoPerfilUrl) {
          this.authService.usuario.set({
            ...usuario,
            fotoPerfilUrl: data.fotoPerfilUrl
          });
        }
      },
      error: () => console.error('Error al cargar personalización')
    });
  }

  cargarMarcos(): void {
    this.personalizacionService.obtenerMarcos().subscribe({
      next: (data) => this.marcosSignal.set(data),
      error: () => console.error('Error al cargar marcos')
    });
  }

  cargarFondos(): void {
    this.personalizacionService.obtenerFondos().subscribe({
      next: (data) => this.fondosSignal.set(data),
      error: () => console.error('Error al cargar fondos')
    });
  }

  guardarPersonalizacion(temaId: string, marcoId: string, fondoId: string): void {
    this.loadingSignal.set(true);
    this.personalizacionService.guardarPersonalizacion({ temaId, marcoId, fondoId }).subscribe({
      next: (data) => {
        this.personalizacionSignal.set(data);
        this.loadingSignal.set(false);
        const usuario = this.authService.usuario();
        if (usuario) {
          this.authService.usuario.set({
            ...usuario,
            fotoPerfilUrl: data.fotoPerfilUrl || usuario.fotoPerfilUrl
          });
        }
      },
      error: () => {
        this.loadingSignal.set(false);
        console.error('Error al guardar personalización');
      }
    });
  }

  recargar(): void {
    this.cargarTodos();
  }
}