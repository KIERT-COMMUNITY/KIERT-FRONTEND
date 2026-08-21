import { Component, OnInit, signal, inject, computed, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionService } from '../../../core/services/personalizacion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'kiert-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private personalizacionService = inject(PersonalizacionService);
  private userService = inject(UserService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  private destroy$ = new Subject<void>();

  // ===== SIGNALS =====
  usuario = this.authService.usuario;
  cargando = signal(false);
  buscando = signal(false);
  enviandoSolicitud = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  editandoPerfil = signal(false);
  busquedaUsuario = signal<string>('');
  usuarioBuscado = signal<User | null>(null);
  usuariosEncontrados = signal<User[]>([]);
  busquedaError = signal<string | null>(null);
  mostrandoResultados = signal(false);
  solicitudEnviada = signal<number | null>(null);

  private busquedaSubject = new Subject<string>();

  selectedTheme = signal<string>('default');
  selectedFrame = signal<string>('none');
  selectedBackground = signal<string>('default');

  colorThemes = this.personalizacionStore.colorThemes;
  marcosData = this.personalizacionStore.marcosData;
  fondosData = this.personalizacionStore.fondosData;

  previewThemeGradient = computed(() => {
    const theme = this.colorThemes().find(t => t.id === this.selectedTheme());
    return theme?.gradient || 'linear-gradient(135deg, #2dd4bf, #0d1117)';
  });

  previewFrameClass = computed(() => `frame-${this.selectedFrame()}`);
  
  previewFrameStyle = computed(() => {
    const id = this.selectedFrame();
    const store = this.personalizacionStore as any;
    return {
      'border': store.marcoBorderStyle(),
      'box-shadow': store.marcoShadowStyle(),
      'background-image': store.marcoGradientStyle(),
      'padding': store.marcoPaddingStyle(),
      'background-origin': 'border-box',
      'background-clip': 'padding-box, border-box',
    };
  });

  formPerfil = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
  });

  constructor() {
    // ✅ EFECTO PARA ACTUALIZAR LA VISTA PREVIA CUANDO CAMBIA LA PERSONALIZACIÓN
    effect(() => {
      const personalizacion = this.personalizacionStore.personalizacion();
      if (personalizacion) {
        console.log('🔄 Settings - Personalización actualizada:', personalizacion);
        this.selectedTheme.set(personalizacion.temaId || 'default');
        this.selectedFrame.set(personalizacion.marcoId || 'none');
        this.selectedBackground.set(personalizacion.fondoId || 'default');
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.personalizacionStore.cargarPersonalizacion();
    this.personalizacionStore.cargarMarcos();
    this.personalizacionStore.cargarFondos();

    const current = this.personalizacionStore.personalizacion();
    if (current) {
      this.selectedTheme.set(current.temaId || 'default');
      this.selectedFrame.set(current.marcoId || 'none');
      this.selectedBackground.set(current.fondoId || 'default');
    }

    this.busquedaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        const username = query.trim();
        if (!username || username.length < 1) {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(null);
          this.mostrandoResultados.set(false);
          return [];
        }
        this.buscando.set(true);
        this.mostrandoResultados.set(true);
        
        return this.userService.buscarUsuarios(username).pipe(
          catchError(error => {
            console.error('Error en búsqueda:', error);
            return of([]);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (usuarios: User[]) => {
        this.buscando.set(false);
        
        if (usuarios && usuarios.length > 0) {
          this.usuariosEncontrados.set(usuarios);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(null);
          
          if (usuarios.length === 1) {
            this.usuarioBuscado.set(usuarios[0]);
          }
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set('No se encontraron usuarios');
        }
      },
      error: (error) => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.usuarioBuscado.set(null);
        this.busquedaError.set('Error al buscar usuarios');
        console.error('Error en búsqueda:', error);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== MÉTODOS DE BÚSQUEDA =====
  onBusquedaChange(): void {
    const query = this.busquedaUsuario().trim();
    if (query.startsWith('@')) {
      this.busquedaSubject.next(query.substring(1));
    } else {
      this.busquedaSubject.next(query);
    }
  }

  buscarUsuario(): void {
    const query = this.busquedaUsuario().trim();
    if (!query) {
      this.busquedaError.set('Ingresa un nombre de usuario');
      return;
    }

    const username = query.startsWith('@') ? query.substring(1) : query;
    this.buscando.set(true);
    this.busquedaError.set(null);
    this.mostrandoResultados.set(true);

    this.userService.buscarUsuarios(username).pipe(
      catchError(error => {
        console.error('Error en búsqueda:', error);
        return of([]);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (usuarios: User[]) => {
        this.buscando.set(false);
        
        if (usuarios && usuarios.length > 0) {
          this.usuariosEncontrados.set(usuarios);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(null);
          
          if (usuarios.length === 1) {
            this.usuarioBuscado.set(usuarios[0]);
            this.exitoMsg.set(`Usuario @${usuarios[0].nombreUsuario} encontrado`);
          } else {
            this.exitoMsg.set(`Se encontraron ${usuarios.length} usuarios`);
          }
          
          setTimeout(() => this.exitoMsg.set(null), 3000);
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(`No se encontraron usuarios con "${username}"`);
        }
      },
      error: (error) => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.usuarioBuscado.set(null);
        this.busquedaError.set('Error al buscar usuarios');
        console.error('Error en búsqueda:', error);
      }
    });
  }

  limpiarBusqueda(): void {
    this.busquedaUsuario.set('');
    this.usuarioBuscado.set(null);
    this.usuariosEncontrados.set([]);
    this.busquedaError.set(null);
    this.mostrandoResultados.set(false);
    this.solicitudEnviada.set(null);
  }

  verPerfilUsuario(usuarioId: number | undefined): void {
    if (usuarioId) {
      console.log(`👤 Navegando al perfil del usuario ID: ${usuarioId}`);
      this.router.navigate(['/usuario', usuarioId]);
    }
  }

  enviarMensaje(usuarioId: number | undefined): void {
    if (usuarioId) {
      this.router.navigate(['/chat', { usuarioId }]);
    }
  }

  enviarSolicitud(usuarioId: number): void {
    if (!usuarioId) return;
    
    this.enviandoSolicitud.set(true);
    this.userService.enviarSolicitudContacto(usuarioId).subscribe({
      next: (response) => {
        this.enviandoSolicitud.set(false);
        this.solicitudEnviada.set(usuarioId);
        this.exitoMsg.set('Solicitud de contacto enviada correctamente');
        setTimeout(() => {
          this.exitoMsg.set(null);
          this.solicitudEnviada.set(null);
        }, 3000);
      },
      error: (error) => {
        this.enviandoSolicitud.set(false);
        const mensaje = error.error?.message || error.error || 'Error al enviar solicitud';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ===== MÉTODOS DE PERSONALIZACIÓN =====
  seleccionarTheme(themeId: string): void {
    this.selectedTheme.set(themeId);
  }

  seleccionarFrame(frameId: string): void {
    this.selectedFrame.set(frameId);
  }

  seleccionarBackground(bgId: string): void {
    this.selectedBackground.set(bgId);
  }

  aplicarPersonalizacion(): void {
    this.cargando.set(true);
    
    const temaId = this.selectedTheme();
    const marcoId = this.selectedFrame();
    const fondoId = this.selectedBackground();
    
    console.log('🎨 Aplicando personalización:', { temaId, marcoId, fondoId });
    
    this.personalizacionStore.guardarPersonalizacion(temaId, marcoId, fondoId);
    
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Personalización aplicada correctamente');
      this.personalizacionStore.recargar();
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 800);
  }

  // ===== MÉTODOS DE PERFIL =====
  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formPerfil.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
        bio: user.bio || '',
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
      next: (data) => {
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

  getInitials(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }

  // ===== NAVEGACIÓN =====
  irChat(): void {
    this.router.navigate(['/chat']);
  }

  irPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  irHistorial(): void {
    this.router.navigate(['/mis-publicaciones']);
  }
}