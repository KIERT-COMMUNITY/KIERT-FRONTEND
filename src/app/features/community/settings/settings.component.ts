import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionService, Personalizacion, Marco, Fondo } from '../../../core/services/personalizacion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

interface ColorTheme {
  id: string;
  name: string;
  colors: string[];
  price: number;
  isFree: boolean;
}

@Component({
  selector: 'kiert-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private personalizacionService = inject(PersonalizacionService);
  private personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);

  usuario = this.authService.usuario;
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  editandoPerfil = signal(false);
  mostrarBusqueda = signal(false);
  queryBusqueda = signal('');

  personalizacion = signal<Personalizacion | null>(null);
  selectedTheme = signal<string>('default');
  selectedFrame = signal<string>('none');
  selectedBackground = signal<string>('default');
  marcos = signal<Marco[]>([]);
  fondos = signal<Fondo[]>([]);
  
  compras = signal<{ themes: string[]; frames: string[]; backgrounds: string[] }>({
    themes: ['default', 'dark', 'light'],
    frames: ['none', 'classic'],
    backgrounds: ['default', 'dark', 'light'],
  });

  previewThemeGradient = computed(() => {
    const fondo = this.fondos().find(f => f.id === this.selectedBackground());
    return fondo?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  });

  previewFrameClass = computed(() => {
    return `frame-${this.selectedFrame()}`;
  });

  previewFrameStyle = computed(() => {
    const marco = this.marcos().find(m => m.id === this.selectedFrame());
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

  colorThemes = signal<ColorTheme[]>([
    { id: 'default', name: 'Default', colors: ['#2dd4bf', '#0d1117'], price: 0, isFree: true },
    { id: 'dark', name: 'Dark', colors: ['#a29bfe', '#1a1a2e'], price: 0, isFree: true },
    { id: 'light', name: 'Light', colors: ['#2dd4bf', '#ffffff'], price: 0, isFree: true },
    { id: 'sunset', name: 'Sunset', colors: ['#ff9f7a', '#2d1b1b'], price: 2, isFree: false },
    { id: 'ocean', name: 'Ocean', colors: ['#5ab8d8', '#0d1a2d'], price: 2, isFree: false },
    { id: 'aurora', name: 'Aurora', colors: ['#a88ae8', '#1a0d2d'], price: 2, isFree: false },
    { id: 'galaxy', name: 'Galaxy', colors: ['#8888e8', '#0d0d1a'], price: 3, isFree: false },
  ]);

  formPerfil = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
    anonimato: [false],
  });

  usuariosEncontrados = signal<any[]>([]);

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.cargarPersonalizacion();
  }

  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formPerfil.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
        bio: user.bio || '',
        anonimato: false,
      });
    }
  }

  cargarPersonalizacion(): void {
    this.personalizacionService.obtenerPersonalizacion().subscribe({
      next: (data: Personalizacion) => {
        this.personalizacion.set(data);
        if (data?.temaId) this.selectedTheme.set(data.temaId);
        if (data?.marcoId) this.selectedFrame.set(data.marcoId);
        if (data?.fondoId) this.selectedBackground.set(data.fondoId);
      },
      error: () => console.error('Error al cargar personalización')
    });

    this.personalizacionService.obtenerMarcos().subscribe({
      next: (data: Marco[]) => {
        this.marcos.set(data);
        const ownedFrames = data.filter(m => m.gratis).map(m => m.id);
        this.compras.update(c => ({
          ...c,
          frames: [...new Set([...c.frames, ...ownedFrames])]
        }));
      },
      error: () => console.error('Error al cargar marcos')
    });

    this.personalizacionService.obtenerFondos().subscribe({
      next: (data: Fondo[]) => {
        this.fondos.set(data);
        const ownedBg = data.filter(f => f.gratis).map(f => f.id);
        this.compras.update(c => ({
          ...c,
          backgrounds: [...new Set([...c.backgrounds, ...ownedBg])]
        }));
      },
      error: () => console.error('Error al cargar fondos')
    });
  }

  isThemeOwned(themeId: string): boolean {
    return this.compras().themes.includes(themeId);
  }

  isFrameOwned(frameId: string): boolean {
    return this.compras().frames.includes(frameId);
  }

  isBackgroundOwned(bgId: string): boolean {
    return this.compras().backgrounds.includes(bgId);
  }

  aplicarPersonalizacion(): void {
    const datos = {
      temaId: this.selectedTheme(),
      marcoId: this.selectedFrame(),
      fondoId: this.selectedBackground(),
    };

    this.cargando.set(true);
    this.personalizacionService.guardarPersonalizacion(datos).subscribe({
      next: (data: Personalizacion) => {
        this.personalizacion.set(data);
        this.cargando.set(false);
        this.exitoMsg.set('Personalización aplicada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.personalizacionStore.recargar();
      },
      error: () => {
        this.cargando.set(false);
        this.errorMsg.set('Error al aplicar personalización');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  seleccionarTheme(themeId: string): void {
    if (!this.isThemeOwned(themeId)) {
      this.errorMsg.set('Debes comprar este tema primero');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.selectedTheme.set(themeId);
  }

  seleccionarFrame(frameId: string): void {
    if (!this.isFrameOwned(frameId)) {
      this.errorMsg.set('Debes comprar este marco primero');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.selectedFrame.set(frameId);
  }

  seleccionarBackground(bgId: string): void {
    if (!this.isBackgroundOwned(bgId)) {
      this.errorMsg.set('Debes comprar este fondo primero');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    this.selectedBackground.set(bgId);
  }

  comprarTheme(themeId: string): void {
    const theme = this.colorThemes().find(t => t.id === themeId);
    if (!theme || theme.isFree) return;
    if (confirm(`Comprar el tema "${theme.name}" por S/${theme.price}?`)) {
      this.compras.update(c => ({ ...c, themes: [...c.themes, themeId] }));
      this.exitoMsg.set(`Tema "${theme.name}" comprado!`);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }
  }

  comprarFrame(frameId: string): void {
    const frame = this.marcos().find(f => f.id === frameId);
    if (!frame || frame.gratis) return;
    if (confirm(`Comprar el marco "${frame.nombre}" por S/${frame.precio}?`)) {
      this.personalizacionService.comprarMarco(frameId).subscribe({
        next: () => {
          this.compras.update(c => ({ ...c, frames: [...c.frames, frameId] }));
          this.exitoMsg.set(`Marco "${frame.nombre}" comprado!`);
          setTimeout(() => this.exitoMsg.set(null), 3000);
          this.cargarPersonalizacion();
        },
        error: () => {
          this.errorMsg.set('Error al comprar el marco');
          setTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
    }
  }

  comprarBackground(bgId: string): void {
    const bg = this.fondos().find(f => f.id === bgId);
    if (!bg || bg.gratis) return;
    if (confirm(`Comprar el fondo "${bg.nombre}" por S/${bg.precio}?`)) {
      this.personalizacionService.comprarFondo(bgId).subscribe({
        next: () => {
          this.compras.update(c => ({ ...c, backgrounds: [...c.backgrounds, bgId] }));
          this.exitoMsg.set(`Fondo "${bg.nombre}" comprado!`);
          setTimeout(() => this.exitoMsg.set(null), 3000);
          this.cargarPersonalizacion();
        },
        error: () => {
          this.errorMsg.set('Error al comprar el fondo');
          setTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
    }
  }

  toggleEditarPerfil(): void {
    this.editandoPerfil.update(val => !val);
    if (this.editandoPerfil()) {
      this.cargarDatosUsuario();
    }
  }

  guardarPerfil(): void {
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Perfil actualizado correctamente');
      this.editandoPerfil.set(false);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 1000);
  }

  subirFotoPerfil(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.cargando.set(true);
    this.personalizacionService.subirFotoPerfil(file).subscribe({
      next: (data: Personalizacion) => {
        this.personalizacion.set(data);
        const user = this.usuario();
        if (user) {
          this.authService.usuario.set({ ...user, fotoPerfilUrl: data.fotoPerfilUrl });
        }
        this.exitoMsg.set('Foto de perfil actualizada');
        this.cargando.set(false);
        this.personalizacionStore.recargar();
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: () => {
        this.errorMsg.set('Error al subir la foto');
        this.cargando.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  toggleBusqueda(): void {
    this.mostrarBusqueda.update(val => !val);
    if (!this.mostrarBusqueda()) {
      this.queryBusqueda.set('');
      this.usuariosEncontrados.set([]);
    }
  }

  buscarUsuarios(): void {
    const query = this.queryBusqueda().trim();
    if (query.length < 2) {
      this.usuariosEncontrados.set([]);
      return;
    }
    const usuariosMock = [
      { id: 1, nombreUsuario: 'admin_kiert', email: 'admin@kiert.com', fotoPerfilUrl: null },
      { id: 2, nombreUsuario: 'root_ana', email: 'ana@kiert.com', fotoPerfilUrl: null },
    ];
    this.usuariosEncontrados.set(
      usuariosMock.filter(u => u.nombreUsuario.toLowerCase().includes(query.toLowerCase()))
    );
  }

  copiarLinkPerfil(usuarioId: number): void {
    const link = `${window.location.origin}/usuario/${usuarioId}`;
    navigator.clipboard.writeText(link).then(() => {
      this.exitoMsg.set('Link copiado al portapapeles');
      setTimeout(() => this.exitoMsg.set(null), 3000);
    });
  }

  getInitials(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }

  formatearPrecio(price: number): string {
    return price === 0 ? 'Gratis' : `S/${price}`;
  }
}