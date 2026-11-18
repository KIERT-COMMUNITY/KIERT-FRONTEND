// src/app/core/services/personalizacion-store.service.ts
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PersonalizacionService, Personalizacion, Marco, Fondo } from './personalizacion.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';

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
  private storage = inject(StorageService);

  private personalizacionSignal = signal<Personalizacion | null>(null);
  private marcosSignal = signal<Marco[]>([]);
  private fondosSignal = signal<Fondo[]>([]);
  private loadingSignal = signal(false);

  readonly personalizacion = computed(() => this.personalizacionSignal());
  readonly marcos = computed(() => this.marcosSignal());
  readonly fondos = computed(() => this.fondosSignal());
  readonly loading = computed(() => this.loadingSignal());

  readonly temaId = computed(() => this.personalizacionSignal()?.temaId || 'default');
  readonly marcoId = computed(() => this.personalizacionSignal()?.marcoId || 'none');
  readonly fondoId = computed(() => this.personalizacionSignal()?.fondoId || 'default');
  readonly fotoPerfil = computed(() => this.personalizacionSignal()?.fotoPerfilUrl || '');

  readonly temaClass = computed(() => `tema-${this.temaId()}`);

  readonly fondoGradiente = computed(() => {
    const fondo = this.fondosSignal().find(f => f.id === this.fondoId());
    return fondo?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  });

  readonly marcoClase = computed(() => `frame-${this.marcoId()}`);

  readonly marcoBorderStyle = computed(() => {
    const id = this.marcoId();
    const map: Record<string, string> = {
      'none': 'none', 'classic': '4px solid #2dd4bf', 'gold': '4px solid #f9ca24',
      'silver': '4px solid #b2bec3', 'rainbow': '4px solid transparent', 'pastel': '4px solid transparent',
      'neon': '4px solid #fd79a8', 'ocean': '4px solid transparent', 'sunset': '4px solid transparent',
      'galaxy': '4px solid transparent', 'fire': '4px solid transparent', 'ice': '4px solid transparent',
      'rose': '4px solid transparent', 'cyber': '4px solid #00d4ff', 'crystal': '4px solid rgba(255,255,255,0.3)',
      'double': 'double 6px #f9ca24', 'star': '4px solid #feca57', 'moon': '4px solid #dfe6e9',
      'sun': '4px solid #fdcb6e', 'elite': '4px solid #6c5ce7',
    };
    return map[id] || '4px solid #2dd4bf';
  });

  readonly marcoShadowStyle = computed(() => {
    const id = this.marcoId();
    const map: Record<string, string> = {
      'gold': '0 0 25px rgba(249,202,36,0.5)', 'silver': '0 0 25px rgba(178,190,195,0.4)',
      'rainbow': '0 0 30px rgba(255,107,107,0.4)', 'pastel': '0 0 30px rgba(253,121,168,0.3)',
      'neon': '0 0 35px rgba(253,121,168,0.6)', 'ocean': '0 0 30px rgba(0,206,201,0.4)',
      'sunset': '0 0 30px rgba(255,107,107,0.4)', 'galaxy': '0 0 35px rgba(108,92,231,0.5)',
      'fire': '0 0 35px rgba(255,107,107,0.6)', 'ice': '0 0 35px rgba(90,184,216,0.5)',
      'rose': '0 0 30px rgba(253,121,168,0.5)', 'cyber': '0 0 40px rgba(0,212,255,0.6)',
      'crystal': '0 0 40px rgba(255,255,255,0.2)', 'double': '0 0 35px rgba(249,202,36,0.5)',
      'star': '0 0 30px rgba(254,202,87,0.4)', 'moon': '0 0 25px rgba(223,230,233,0.3)',
      'sun': '0 0 30px rgba(253,203,110,0.4)', 'elite': '0 0 40px rgba(108,92,231,0.6)',
    };
    return map[id] || 'none';
  });

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

  readonly marcoPaddingStyle = computed(() => {
    const gradientFrames = ['rainbow', 'pastel', 'ocean', 'sunset', 'galaxy', 'fire', 'ice', 'rose', 'crystal'];
    return gradientFrames.includes(this.marcoId()) ? '4px' : '0px';
  });

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

  // ============================================================
  // ESCALA DE FUENTE
  // ============================================================
  readonly escalaFuente = signal<number>(this.cargarEscalaGuardada());
  readonly etiquetaEscala = computed(() => {
    const v = this.escalaFuente();
    if (v <= 0.9) return 'Muy pequeño';
    if (v <= 0.98) return 'Pequeño';
    if (v <= 1.05) return 'Normal';
    if (v <= 1.18) return 'Grande';
    if (v <= 1.3) return 'Muy grande';
    return 'Enorme';
  });
  readonly porcentajeEscala = computed(() => Math.round(this.escalaFuente() * 100));
  readonly tamanosPredefinidos = [
    { id: 'xs',  label: 'Muy pequeño', valor: 0.85, icono: 'A' },
    { id: 'sm',  label: 'Pequeño',     valor: 0.92, icono: 'A' },
    { id: 'md',  label: 'Normal',      valor: 1.00, icono: 'A' },
    { id: 'lg',  label: 'Grande',      valor: 1.12, icono: 'A+' },
    { id: 'xl',  label: 'Muy grande',  valor: 1.25, icono: 'A++' },
    { id: 'xxl', label: 'Enorme',      valor: 1.40, icono: 'A+++' },
  ];

  // ============================================================
  // TEMAS (20 colores sólidos)
  // ============================================================
  readonly colorThemes = signal<ColorTheme[]>([
    { id: 'default',  name: 'Default',  colors: ['#2dd4bf', '#2dd4bf'], gradient: 'linear-gradient(135deg, #2dd4bf, #2dd4bf)', isFree: true },
    { id: 'red',      name: 'Rojo',     colors: ['#ff0000', '#ff0000'], gradient: 'linear-gradient(135deg, #ff0000, #ff0000)', isFree: true },
    { id: 'green',    name: 'Verde',    colors: ['#00c853', '#00c853'], gradient: 'linear-gradient(135deg, #00c853, #00c853)', isFree: true },
    { id: 'blue',     name: 'Azul',     colors: ['#0066ff', '#0066ff'], gradient: 'linear-gradient(135deg, #0066ff, #0066ff)', isFree: true },
    { id: 'yellow',   name: 'Amarillo', colors: ['#ffd600', '#ffd600'], gradient: 'linear-gradient(135deg, #ffd600, #ffd600)', isFree: true },
    { id: 'orange',   name: 'Naranja',  colors: ['#ff6d00', '#ff6d00'], gradient: 'linear-gradient(135deg, #ff6d00, #ff6d00)', isFree: true },
    { id: 'purple',   name: 'Morado',   colors: ['#9c27b0', '#9c27b0'], gradient: 'linear-gradient(135deg, #9c27b0, #9c27b0)', isFree: true },
    { id: 'pink',     name: 'Rosa',     colors: ['#ff4081', '#ff4081'], gradient: 'linear-gradient(135deg, #ff4081, #ff4081)', isFree: true },
    { id: 'cyan',     name: 'Cian',     colors: ['#00e5ff', '#00e5ff'], gradient: 'linear-gradient(135deg, #00e5ff, #00e5ff)', isFree: true },
    { id: 'white',    name: 'Blanco',   colors: ['#ffffff', '#ffffff'], gradient: 'linear-gradient(135deg, #ffffff, #ffffff)', isFree: true },
    { id: 'black',    name: 'Negro',    colors: ['#000000', '#000000'], gradient: 'linear-gradient(135deg, #000000, #000000)', isFree: true },
    { id: 'gray',     name: 'Gris',     colors: ['#9e9e9e', '#9e9e9e'], gradient: 'linear-gradient(135deg, #9e9e9e, #9e9e9e)', isFree: true },
    { id: 'lime',     name: 'Lima',     colors: ['#c6ff00', '#c6ff00'], gradient: 'linear-gradient(135deg, #c6ff00, #c6ff00)', isFree: true },
    { id: 'teal',     name: 'Turquesa', colors: ['#009688', '#009688'], gradient: 'linear-gradient(135deg, #009688, #009688)', isFree: true },
    { id: 'brown',    name: 'Marrón',   colors: ['#795548', '#795548'], gradient: 'linear-gradient(135deg, #795548, #795548)', isFree: true },
    { id: 'indigo',   name: 'Índigo',   colors: ['#3f51b5', '#3f51b5'], gradient: 'linear-gradient(135deg, #3f51b5, #3f51b5)', isFree: true },
    { id: 'crimson',  name: 'Carmesí',  colors: ['#dc143c', '#dc143c'], gradient: 'linear-gradient(135deg, #dc143c, #dc143c)', isFree: true },
    { id: 'gold',     name: 'Dorado',   colors: ['#ffc107', '#ffc107'], gradient: 'linear-gradient(135deg, #ffc107, #ffc107)', isFree: true },
    { id: 'silver',   name: 'Plateado', colors: ['#cfd8dc', '#cfd8dc'], gradient: 'linear-gradient(135deg, #cfd8dc, #cfd8dc)', isFree: true },
    { id: 'navy',     name: 'Azul marino', colors: ['#001f5c', '#001f5c'], gradient: 'linear-gradient(135deg, #001f5c, #001f5c)', isFree: true },
  ]);

  // ============================================================
  // MARCOS (sin cambios)
  // ============================================================
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

  // ============================================================
  // FONDOS (20 colores sólidos)
  // ============================================================
  readonly fondosData = signal<FondoItem[]>([
    { id: 'default',  name: 'Default',      gradient: 'linear-gradient(135deg, #2dd4bf, #2dd4bf)', isFree: true, description: 'Turquesa clásico' },
    { id: 'red',      name: 'Rojo',         gradient: 'linear-gradient(135deg, #ff0000, #ff0000)', isFree: true, description: 'Rojo intenso' },
    { id: 'green',    name: 'Verde',        gradient: 'linear-gradient(135deg, #00c853, #00c853)', isFree: true, description: 'Verde vivo' },
    { id: 'blue',     name: 'Azul',         gradient: 'linear-gradient(135deg, #0066ff, #0066ff)', isFree: true, description: 'Azul eléctrico' },
    { id: 'yellow',   name: 'Amarillo',     gradient: 'linear-gradient(135deg, #ffd600, #ffd600)', isFree: true, description: 'Amarillo brillante' },
    { id: 'orange',   name: 'Naranja',      gradient: 'linear-gradient(135deg, #ff6d00, #ff6d00)', isFree: true, description: 'Naranja cálido' },
    { id: 'purple',   name: 'Morado',       gradient: 'linear-gradient(135deg, #9c27b0, #9c27b0)', isFree: true, description: 'Morado profundo' },
    { id: 'pink',     name: 'Rosa',         gradient: 'linear-gradient(135deg, #ff4081, #ff4081)', isFree: true, description: 'Rosa vibrante' },
    { id: 'cyan',     name: 'Cian',         gradient: 'linear-gradient(135deg, #00e5ff, #00e5ff)', isFree: true, description: 'Cian brillante' },
    { id: 'white',    name: 'Blanco',       gradient: 'linear-gradient(135deg, #ffffff, #ffffff)', isFree: true, description: 'Blanco puro' },
    { id: 'black',    name: 'Negro',        gradient: 'linear-gradient(135deg, #000000, #000000)', isFree: true, description: 'Negro absoluto' },
    { id: 'gray',     name: 'Gris',         gradient: 'linear-gradient(135deg, #9e9e9e, #9e9e9e)', isFree: true, description: 'Gris neutro' },
    { id: 'lime',     name: 'Lima',         gradient: 'linear-gradient(135deg, #c6ff00, #c6ff00)', isFree: true, description: 'Lima eléctrico' },
    { id: 'teal',     name: 'Turquesa',     gradient: 'linear-gradient(135deg, #009688, #009688)', isFree: true, description: 'Turquesa profundo' },
    { id: 'brown',    name: 'Marrón',       gradient: 'linear-gradient(135deg, #795548, #795548)', isFree: true, description: 'Marrón tierra' },
    { id: 'indigo',   name: 'Índigo',       gradient: 'linear-gradient(135deg, #3f51b5, #3f51b5)', isFree: true, description: 'Índigo intenso' },
    { id: 'crimson',  name: 'Carmesí',      gradient: 'linear-gradient(135deg, #dc143c, #dc143c)', isFree: true, description: 'Carmesí fuerte' },
    { id: 'gold',     name: 'Dorado',       gradient: 'linear-gradient(135deg, #ffc107, #ffc107)', isFree: true, description: 'Dorado brillante' },
    { id: 'silver',   name: 'Plateado',     gradient: 'linear-gradient(135deg, #cfd8dc, #cfd8dc)', isFree: true, description: 'Plateado suave' },
    { id: 'navy',     name: 'Azul marino',  gradient: 'linear-gradient(135deg, #001f5c, #001f5c)', isFree: true, description: 'Azul profundo' },
  ]);

  // ============================================================
  // CONSTRUCTOR
  // ============================================================
  constructor() {
    // 1) Cargar personalización cuando cambia el usuario
    effect(() => {
      const usuario = this.authService.usuario();
      if (usuario) {
        console.log('Usuario logueado, cargando personalización...');
        this.cargarTodos();
      } else if (this.storage.esInvitado()) {
        console.log('Modo invitado detectado, reseteando personalización...');
        this.resetear();
      }
    });

    // 2) Aplicar escala de fuente al DOM
    effect(() => {
      const escala = this.escalaFuente();
      this.aplicarEscalaFuente(escala);
    });

    // 3) ✅ NUEVO: aplicar tema/marco/fondo al DOM cuando cambie la personalización
    //    Esto garantiza que CUALQUIER ruta (notificaciones, chat, etc.) herede el tema.
    effect(() => {
      const p = this.personalizacionSignal();
      if (!p) return;

      this.aplicarTemaGlobal(p.temaId || 'default');
      this.aplicarMarcoGlobal(p.marcoId || 'none');
      this.aplicarFondoGlobal(p.fondoId || 'default');
    });
  }

  // ============================================================
  // APLICAR AL DOM (global)
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
  }

  private aplicarMarcoGlobal(marcoId: string): void {
    const html = document.documentElement;
    const body = document.body;
    const marco = marcoId || 'none';
    html.setAttribute('data-marco', marco);
    body.setAttribute('data-marco', marco);
  }

  private aplicarFondoGlobal(fondoId: string): void {
    const html = document.documentElement;
    const body = document.body;
    const fondo = fondoId || 'default';
    html.setAttribute('data-fondo', fondo);
    body.setAttribute('data-fondo', fondo);
  }

  // ============================================================
  // RESET (logout / invitado)
  // ============================================================
  resetear(): void {
    this.personalizacionSignal.set({
      id: 0, usuarioId: 0,
      temaId: 'default', marcoId: 'none', fondoId: 'default',
      fotoPerfilUrl: '', fotoPortadaUrl: '', marcoPersonalizadoUrl: ''
    });

    const limpiarTodo = (el: HTMLElement) => {
      el.removeAttribute('data-theme');
      el.removeAttribute('data-marco');
      el.removeAttribute('data-fondo');
      Array.from(el.classList)
        .filter(c => c.startsWith('tema-'))
        .forEach(c => el.classList.remove(c));
    };

    limpiarTodo(document.documentElement);
    limpiarTodo(document.body);

    document.documentElement.setAttribute('data-theme', 'default');
    document.documentElement.setAttribute('data-marco', 'none');
    document.documentElement.setAttribute('data-fondo', 'default');
    document.documentElement.classList.add('tema-default');

    document.body.setAttribute('data-theme', 'default');
    document.body.setAttribute('data-marco', 'none');
    document.body.setAttribute('data-fondo', 'default');
    document.body.classList.add('tema-default');

    document.body.style.backgroundImage = '';
    document.body.style.background = '';

    this.setEscalaFuente(1.0);
    console.log('[PERSONALIZACION] Reset a tema default');
  }

  // ============================================================
  // ESCALA DE FUENTE
  // ============================================================
  private aplicarEscalaFuente(escala: number): void {
    const basePx = 16 * escala;
    document.documentElement.style.fontSize = `${basePx}px`;
    document.documentElement.style.setProperty('--escala-fuente', String(escala));
    document.documentElement.style.setProperty('--escala-fuente-px', `${basePx}px`);
    this.storage.setLocal('kiert_escala_fuente', String(escala));
  }

  private cargarEscalaGuardada(): number {
    const guardada = this.storage.getLocal('kiert_escala_fuente');
    if (guardada) {
      const num = parseFloat(guardada);
      if (num >= 0.75 && num <= 1.5) return num;
    }
    return 1.0;
  }

  setEscalaFuente(escala: number): void {
    const clamped = Math.max(0.75, Math.min(1.5, escala));
    this.escalaFuente.set(clamped);
  }

  ajustarEscala(delta: number): void {
    this.setEscalaFuente(this.escalaFuente() + delta);
  }

  resetearEscala(): void {
    this.setEscalaFuente(1.0);
  }

  esPresetActivo(valor: number): boolean {
    return Math.abs(this.escalaFuente() - valor) < 0.02;
  }

  // ============================================================
  // CARGA
  // ============================================================
  cargarTodos(): void {
    this.loadingSignal.set(true);
    forkJoin({
      personalizacion: this.personalizacionService.obtenerPersonalizacion().pipe(
        catchError(() => of({
          id: 0, usuarioId: 0,
          temaId: 'default', marcoId: 'none', fondoId: 'default',
          fotoPerfilUrl: '', fotoPortadaUrl: '', marcoPersonalizadoUrl: ''
        } as Personalizacion))
      ),
      marcos: this.personalizacionService.obtenerMarcos().pipe(catchError(() => of([]))),
      fondos: this.personalizacionService.obtenerFondos().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ personalizacion, marcos, fondos }) => {
        console.log('Personalización cargada:', personalizacion);
        this.personalizacionSignal.set(personalizacion);
        this.marcosSignal.set(marcos);
        this.fondosSignal.set(fondos);
        this.loadingSignal.set(false);

        const usuario = this.authService.usuario();
        if (usuario && personalizacion.fotoPerfilUrl && usuario.fotoPerfilUrl !== personalizacion.fotoPerfilUrl) {
          this.authService.usuario.set({ ...usuario, fotoPerfilUrl: personalizacion.fotoPerfilUrl });
        }
      },
      error: () => this.loadingSignal.set(false)
    });
  }

  cargarPersonalizacion(): void {
    this.personalizacionService.obtenerPersonalizacion().subscribe({
      next: (data) => {
        console.log('Personalización cargada:', data);
        this.personalizacionSignal.set(data);
        const usuario = this.authService.usuario();
        if (usuario && data.fotoPerfilUrl && usuario.fotoPerfilUrl !== data.fotoPerfilUrl) {
          this.authService.usuario.set({ ...usuario, fotoPerfilUrl: data.fotoPerfilUrl });
        }
      },
      error: (error) => {
        console.error('Error al cargar personalización:', error);
        this.personalizacionSignal.set({
          id: 0, usuarioId: 0,
          temaId: 'default', marcoId: 'none', fondoId: 'default',
          fotoPerfilUrl: '', fotoPortadaUrl: '', marcoPersonalizadoUrl: ''
        });
      }
    });
  }

  cargarMarcos(): void {
    this.personalizacionService.obtenerMarcos().subscribe({
      next: (data) => this.marcosSignal.set(data),
      error: (error) => console.error('Error al cargar marcos:', error)
    });
  }

  cargarFondos(): void {
    this.personalizacionService.obtenerFondos().subscribe({
      next: (data) => this.fondosSignal.set(data),
      error: (error) => console.error('Error al cargar fondos:', error)
    });
  }

  // ============================================================
  // ✅ FIX: guardarPersonalizacion devuelve Observable
  // ============================================================
  guardarPersonalizacion(temaId: string, marcoId: string, fondoId: string): Observable<Personalizacion> {
    console.log('Guardando personalización:', { temaId, marcoId, fondoId });
    this.loadingSignal.set(true);

    const datos = {
      temaId: temaId || 'default',
      marcoId: marcoId || 'none',
      fondoId: fondoId || 'default'
    };

    // Actualizar signal inmediatamente para que el effect no revierta
    const actual = this.personalizacionSignal();
    if (actual) {
      this.personalizacionSignal.set({
        ...actual,
        temaId: datos.temaId,
        marcoId: datos.marcoId,
        fondoId: datos.fondoId
      });
    }

    return this.personalizacionService.guardarPersonalizacion(datos).pipe(
      tap((data) => {
        console.log('Personalización guardada:', data);
        this.personalizacionSignal.set(data);
        this.loadingSignal.set(false);
        const usuario = this.authService.usuario();
        if (usuario) {
          this.authService.usuario.set({
            ...usuario,
            fotoPerfilUrl: data.fotoPerfilUrl || usuario.fotoPerfilUrl
          });
        }
      }),
      catchError((error) => {
        console.error('Error al guardar personalización:', error);
        this.loadingSignal.set(false);
        if (actual) this.personalizacionSignal.set(actual); // revertir
        return throwError(() => error);
      })
    );
  }

  recargar(): void {
    console.log('Recargando personalización...');
    this.cargarTodos();
  }
}