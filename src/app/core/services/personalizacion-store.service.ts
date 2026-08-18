import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { PersonalizacionService, Personalizacion, Marco, Fondo } from './personalizacion.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PersonalizacionStore {
  private personalizacionService = inject(PersonalizacionService);
  private authService = inject(AuthService);

  private personalizacionSignal = signal<Personalizacion | null>(null);
  private marcosSignal = signal<Marco[]>([]);
  private fondosSignal = signal<Fondo[]>([]);
  private loadingSignal = signal(false);
  
  // Compras del usuario (persistentes)
  private comprasSignal = signal<{ themes: string[]; frames: string[]; backgrounds: string[] }>({
    themes: ['default', 'dark', 'light'],
    frames: ['none', 'classic'],
    backgrounds: ['default', 'dark', 'light'],
  });

  readonly personalizacion = computed(() => this.personalizacionSignal());
  readonly marcos = computed(() => this.marcosSignal());
  readonly fondos = computed(() => this.fondosSignal());
  readonly loading = computed(() => this.loadingSignal());
  readonly compras = computed(() => this.comprasSignal());

  // ========== GETTERS ==========
  readonly temaId = computed(() => this.personalizacionSignal()?.temaId || 'default');
  readonly marcoId = computed(() => this.personalizacionSignal()?.marcoId || 'none');
  readonly fondoId = computed(() => this.personalizacionSignal()?.fondoId || 'default');
  readonly fotoPerfil = computed(() => this.personalizacionSignal()?.fotoPerfilUrl || '');

  // ========== MARCO ==========
  readonly marcoSeleccionado = computed(() => {
    const id = this.marcoId();
    return this.marcosSignal().find(m => m.id === id);
  });

  // ========== FONDO ==========
  readonly fondoSeleccionado = computed(() => {
    const id = this.fondoId();
    return this.fondosSignal().find(f => f.id === id);
  });

  // ========== GRADIENTE DEL FONDO (SOLO PARA PERFIL Y CHAT) ==========
  readonly fondoGradiente = computed(() => {
    const fondo = this.fondoSeleccionado();
    return fondo?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  });

  // ========== CLASE DEL MARCO (PARA PERFIL) ==========
  readonly marcoClase = computed(() => {
    const id = this.marcoId();
    return `frame-${id}`;
  });

  // ========== ESTILO DEL MARCO ==========
  readonly marcoEstilo = computed(() => {
    const marco = this.marcoSeleccionado();
    if (marco?.urlImagen) {
      return {
        'border-image': `url(${marco.urlImagen}) 30 stretch`,
        'border-image-slice': '30',
        'border-image-width': '8px',
        'border-style': 'solid',
        'border-color': 'transparent'
      };
    }
    return {};
  });

  // ========== TEMA CSS CLASS (PARA TODA LA PÁGINA) ==========
  readonly temaClass = computed(() => {
    const id = this.temaId();
    return `tema-${id}`;
  });

  // ========== VERIFICAR SI POSEE ==========
  isThemeOwned(themeId: string): boolean {
    return this.comprasSignal().themes.includes(themeId);
  }

  isFrameOwned(frameId: string): boolean {
    return this.comprasSignal().frames.includes(frameId);
  }

  isBackgroundOwned(bgId: string): boolean {
    return this.comprasSignal().backgrounds.includes(bgId);
  }

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
    setTimeout(() => this.loadingSignal.set(false), 1000);
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
      next: (data: Marco[]) => {
        this.marcosSignal.set(data);
        // Actualizar compras de marcos (los gratis ya los tiene)
        const ownedFrames = data.filter(m => m.gratis).map(m => m.id);
        this.comprasSignal.update(c => ({
          ...c,
          frames: [...new Set([...c.frames, ...ownedFrames])]
        }));
      },
      error: () => console.error('Error al cargar marcos')
    });
  }

  cargarFondos(): void {
    this.personalizacionService.obtenerFondos().subscribe({
      next: (data: Fondo[]) => {
        this.fondosSignal.set(data);
        const ownedBg = data.filter(f => f.gratis).map(f => f.id);
        this.comprasSignal.update(c => ({
          ...c,
          backgrounds: [...new Set([...c.backgrounds, ...ownedBg])]
        }));
      },
      error: () => console.error('Error al cargar fondos')
    });
  }

  // ========== COMPRAR ==========
  comprarMarco(marcoId: string): void {
    this.personalizacionService.comprarMarco(marcoId).subscribe({
      next: () => {
        this.comprasSignal.update(c => ({
          ...c,
          frames: [...c.frames, marcoId]
        }));
        this.cargarMarcos();
      },
      error: () => console.error('Error al comprar marco')
    });
  }

  comprarFondo(fondoId: string): void {
    this.personalizacionService.comprarFondo(fondoId).subscribe({
      next: () => {
        this.comprasSignal.update(c => ({
          ...c,
          backgrounds: [...c.backgrounds, fondoId]
        }));
        this.cargarFondos();
      },
      error: () => console.error('Error al comprar fondo')
    });
  }

  comprarTheme(themeId: string): void {
    this.comprasSignal.update(c => ({
      ...c,
      themes: [...c.themes, themeId]
    }));
  }

  actualizarPersonalizacion(data: Personalizacion): void {
    this.personalizacionSignal.set(data);
    const usuario = this.authService.usuario();
    if (usuario && data.fotoPerfilUrl) {
      this.authService.usuario.set({
        ...usuario,
        fotoPerfilUrl: data.fotoPerfilUrl
      });
    }
  }

  recargar(): void {
    this.cargarTodos();
  }
}