// src/app/features/settings/settings.component.ts
import { Component, OnInit, signal, computed, inject, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionService } from '../../../core/services/personalizacion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { UserService } from '../../../core/services/user.service';
import { BloqueoService, Bloqueo } from '../../../core/services/bloqueo.service';
import { User } from '../../../core/models/user.model';

type SeccionActiva = 'perfil' | 'bloqueados';

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
  private bloqueoService = inject(BloqueoService);
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

  // ===== SECCIÓN ACTIVA =====
  seccionActiva = signal<SeccionActiva>('perfil');

  // ===== BLOQUEADOS =====
  bloqueados = signal<Bloqueo[]>([]);
  cargandoBloqueados = signal(false);
  busquedaBloqueado = signal('');

  bloqueadosFiltrados = computed(() => {
    const query = this.busquedaBloqueado().toLowerCase().trim();
    if (!query) return this.bloqueados();
    return this.bloqueados().filter(b =>
      b.usuarioBloqueadoNombre?.toLowerCase().includes(query) ||
      b.motivo?.toLowerCase().includes(query)
    );
  });

  // Selectores toggle
  showThemeSelector = signal(false);
  showFrameSelector = signal(false);
  showBackgroundSelector = signal(false);

  private busquedaSubject = new Subject<string>();

  selectedTheme = signal<string>('default');
  selectedFrame = signal<string>('none');
  selectedBackground = signal<string>('default');

  colorThemes = this.personalizacionStore.colorThemes;
  marcosData = this.personalizacionStore.marcosData;
  fondosData = this.personalizacionStore.fondosData;

  formPerfil = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
  });

  constructor() {
    // Efecto: cuando cambia la personalización en el store, sincroniza los signals
    effect(() => {
      const personalizacion = this.personalizacionStore.personalizacion();
      if (personalizacion) {
        this.selectedTheme.set(personalizacion.temaId || 'default');
        this.selectedFrame.set(personalizacion.marcoId || 'none');
        this.selectedBackground.set(personalizacion.fondoId || 'default');
        // Aplicar tema global siempre que cambie la personalización
        this.aplicarTemaGlobal(personalizacion.temaId || 'default');
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.personalizacionStore.cargarPersonalizacion();
    this.personalizacionStore.cargarMarcos();
    this.personalizacionStore.cargarFondos();
    this.cargarBloqueados();

    const current = this.personalizacionStore.personalizacion();
    if (current) {
      this.selectedTheme.set(current.temaId || 'default');
      this.selectedFrame.set(current.marcoId || 'none');
      this.selectedBackground.set(current.fondoId || 'default');
      this.aplicarTemaGlobal(current.temaId || 'default');
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
          catchError(() => of([]))
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
          if (usuarios.length === 1) this.usuarioBuscado.set(usuarios[0]);
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set('No se encontraron usuarios');
        }
      },
      error: () => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.busquedaError.set('Error al buscar usuarios');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============================================================
  // NAVEGACIÓN ENTRE SECCIONES
  // ============================================================
  irASeccion(seccion: SeccionActiva): void {
    this.seccionActiva.set(seccion);

    if (seccion === 'bloqueados') {
      this.cargarBloqueados();
    }

    setTimeout(() => {
      const element = document.getElementById(seccion);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }

  // ============================================================
  // BLOQUEADOS
  // ============================================================
  cargarBloqueados(): void {
    this.cargandoBloqueados.set(true);
    this.bloqueoService.listarBloqueados().subscribe({
      next: (data) => {
        this.bloqueados.set(data || []);
        this.cargandoBloqueados.set(false);
      },
      error: (err) => {
        console.error('Error al cargar bloqueados:', err);
        this.cargandoBloqueados.set(false);
      }
    });
  }

  desbloquear(usuarioId: number, nombreUsuario: string): void {
    if (!confirm(`¿Desbloquear a @${nombreUsuario}? Volverán a poder enviarse mensajes.`)) return;

    this.bloqueoService.desbloquear(usuarioId).subscribe({
      next: () => {
        this.exitoMsg.set(`@${nombreUsuario} desbloqueado correctamente`);
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.cargarBloqueados();
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.error || 'Error al desbloquear');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  formatearFecha(fecha: string | Date): string {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // ============================================================
  // APLICAR TEMA GLOBAL (cambia fondo de página + color de letras)
  // ============================================================
  aplicarTemaGlobal(themeId: string): void {
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

    console.log('🎨 Tema aplicado globalmente:', tema);
  }

  // ============================================================
  // TOGGLES DE SELECTORES
  // ============================================================
  toggleThemeSelector(): void {
    this.showThemeSelector.update(v => !v);
    this.showFrameSelector.set(false);
    this.showBackgroundSelector.set(false);
  }

  toggleFrameSelector(): void {
    this.showFrameSelector.update(v => !v);
    this.showThemeSelector.set(false);
    this.showBackgroundSelector.set(false);
  }

  toggleBackgroundSelector(): void {
    this.showBackgroundSelector.update(v => !v);
    this.showThemeSelector.set(false);
    this.showFrameSelector.set(false);
  }

  // ============================================================
  // BÚSQUEDA DE USUARIOS
  // ============================================================
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
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (usuarios: User[]) => {
        this.buscando.set(false);
        if (usuarios && usuarios.length > 0) {
          this.usuariosEncontrados.set(usuarios);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(null);
          if (usuarios.length === 1) this.usuarioBuscado.set(usuarios[0]);
        } else {
          this.usuariosEncontrados.set([]);
          this.usuarioBuscado.set(null);
          this.busquedaError.set(`No se encontraron usuarios con "${username}"`);
        }
      },
      error: () => {
        this.buscando.set(false);
        this.usuariosEncontrados.set([]);
        this.busquedaError.set('Error al buscar usuarios');
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
    if (usuarioId) this.router.navigate(['/usuario', usuarioId]);
  }

  enviarMensaje(usuarioId: number | undefined): void {
    if (usuarioId) this.router.navigate(['/chat', usuarioId]);
  }

  enviarSolicitud(usuarioId: number): void {
    if (!usuarioId) return;
    this.enviandoSolicitud.set(true);
    this.userService.enviarSolicitudContacto(usuarioId).subscribe({
      next: () => {
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
        const mensaje = error.error?.mensaje || error.error?.error || 'Error al enviar solicitud';
        this.errorMsg.set(mensaje);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ============================================================
  // PERSONALIZACIÓN
  // ============================================================
  seleccionarTheme(themeId: string): void {
    this.selectedTheme.set(themeId);
    // Aplicar en vivo (preview) al cambiar
    this.aplicarTemaGlobal(themeId);
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

    this.aplicarTemaGlobal(temaId);
    this.personalizacionStore.guardarPersonalizacion(temaId, marcoId, fondoId);

    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('Personalización aplicada correctamente');
      this.personalizacionStore.recargar();
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 800);
  }

  // ============================================================
  // PERFIL
  // ============================================================
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
    this.editandoPerfil.update(v => !v);
    if (this.editandoPerfil()) this.cargarDatosUsuario();
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

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  irChat(): void { this.router.navigate(['/chat']); }
  irPerfil(): void { this.router.navigate(['/perfil']); }
  irHistorial(): void { this.router.navigate(['/mis-publicaciones']); }
}