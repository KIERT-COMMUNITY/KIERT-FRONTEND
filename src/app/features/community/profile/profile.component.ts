// src/app/features/profile/profile.component.ts
import {
  Component, signal, computed, inject, OnInit, OnDestroy,
  ChangeDetectorRef, effect, isDevMode
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';
import { BloqueoService } from '../../../core/services/bloqueo.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { ImageSanitizerService } from '../../../core/services/image-sanitizer.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import { safeUrl, safeClassToken } from '../../../shared/utils/url-sanitizer';

@Component({
  selector: 'kiert-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AvisoLoginComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private postService = inject(PostService);
  private bloqueoService = inject(BloqueoService);
  private imageSanitizer = inject(ImageSanitizerService);
  private userService = inject(UserService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== ESTADO =====
  subiendoFoto = signal(false);
  previsualizacion = signal<string | null>(null);
  editando = signal(false);
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // ===== ELIMINAR FOTO =====
  mostrarConfirmEliminarFoto = signal(false);
  eliminandoFoto = signal(false);

  // ===== LOGOUT =====
  mostrarConfirmLogout = signal(false);

  // ===== ESTADISTICAS =====
  totalPosts = signal(0);
  totalBloqueados = signal(0);

  // ===== AVISO LOGIN =====
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para ver tu perfil.');

  // ===== USUARIO =====
  usuario = this.authService.usuario;

  inicial = computed(() => this.usuario()?.nombreUsuario?.charAt(0)?.toUpperCase() || '?');
  nombreCompleto = computed(() => this.usuario()?.nombreUsuario || 'Usuario');
  email = computed(() => this.usuario()?.email || 'Sin correo');

  // URL saneada de la foto (para el template)
  fotoPerfil = computed(() => safeUrl(this.usuario()?.fotoPerfilUrl));
  bio = computed(() => this.usuario()?.bio || null);

  // Clase de fondo saneada (evita inyección en class="...")
  fondoSeguro = computed(() => 'fondo-' + safeClassToken(this.personalizacionStore.fondoId(), 'default'));

  // ===== FORMULARIO =====
  formEditar = this.fb.group({
    nombreUsuario: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(20),
      // Solo alfanumérico, guion bajo, punto y guion
      Validators.pattern(/^[a-zA-Z0-9_.-]+$/)
    ]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    bio: ['', [Validators.maxLength(150)]],
  });

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();
  private lectorActual: FileReader | null = null;

  constructor() {
    effect(() => {
      const tema = this.personalizacionStore.temaId();
      this.aplicarTemaGlobal(tema);
    });
  }

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  ngOnInit(): void {
    if (!this.estaLogueado) {
      this.mensajeAvisoLogin.set('Debes registrarte para ver tu perfil.');
      this.mostrarAvisoLogin.set(true);
      return;
    }

    this.cargarEstadisticas();
    this.cargarDatosUsuario();

    const tema = this.personalizacionStore.temaId();
    this.aplicarTemaGlobal(tema);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();

    if (this.lectorActual) {
      this.lectorActual.onload = null;
      this.lectorActual.onerror = null;
      try { this.lectorActual.abort(); } catch { /* noop */ }
      this.lectorActual = null;
    }
  }

  // setTimeout rastreable
  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  // Navegacion al login
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/perfil' } });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  abrirAvisoLogin(mensaje: string): void {
    this.mensajeAvisoLogin.set(mensaje);
    this.mostrarAvisoLogin.set(true);
  }

  // ============================================================
  // TEMA GLOBAL
  // ============================================================
  private aplicarTemaGlobal(themeId: string): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    const body = document.body;
    const tema = safeClassToken(themeId, 'default');

    const limpiar = (el: HTMLElement) => {
      el.removeAttribute('data-theme');
      Array.from(el.classList)
        .filter(c => c.startsWith('tema-'))
        .forEach(c => el.classList.remove(c));
    };

    limpiar(html);
    limpiar(body);

    html.setAttribute('data-theme', tema);
    html.classList.add(`tema-${tema}`);
    body.setAttribute('data-theme', tema);
    body.classList.add(`tema-${tema}`);
  }

  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formEditar.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
        bio: user.bio || '',
      });
    }
  }

  cargarEstadisticas(): void {
    if (!this.estaLogueado) return;

    this.postService.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: posts => {
        const userId = this.usuario()?.id;
        if (userId) {
          this.totalPosts.set(posts.filter(p => p.autor?.id === userId).length);
        }
      },
      error: () => {}
    });

    this.bloqueoService.listarBloqueados().pipe(takeUntil(this.destroy$)).subscribe({
      next: bloqueados => this.totalBloqueados.set(bloqueados?.length ?? 0),
      error: () => {}
    });
  }

  // ============================================================
  // FOTO DE PERFIL
  // ============================================================
  async onFotoSeleccionada(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement | null;
    if (!input) return;

    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para subir una foto de perfil.');
      input.value = '';
      return;
    }

    const archivoOriginal = input.files?.[0];
    if (!archivoOriginal) { input.value = ''; return; }

    // Validacion MIME declarada
    if (!archivoOriginal.type.startsWith('image/')) {
      this.errorMsg.set('Solo se permiten imagenes');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    // Limite de tamano
    if (archivoOriginal.size > 10 * 1024 * 1024) {
      this.errorMsg.set('La imagen no debe superar los 10MB');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      input.value = '';
      return;
    }

    try {
      // ImageSanitizerService debe re-codificar la imagen (canvas) y devolver Blob seguro
      const archivoLimpio = await this.imageSanitizer.limpiarFotoPerfil(archivoOriginal);

      // Verificacion adicional: tipo final debe ser imagen raster
      if (!/^image\/(jpeg|png|webp)$/i.test(archivoLimpio.type)) {
        this.errorMsg.set('Formato de imagen no permitido');
        this.safeTimeout(() => this.errorMsg.set(null), 3000);
        input.value = '';
        return;
      }

      // Preview via FileReader (rastreado)
      this.leerComoDataUrl(archivoLimpio);

      this.subiendoFoto.set(true);
      this.errorMsg.set(null);

      this.authService.subirFotoMultipart(archivoLimpio)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (usuarioActualizado: User) => {
            this.subiendoFoto.set(false);
            this.previsualizacion.set(null);
            this.exitoMsg.set('Foto actualizada correctamente');
            this.safeTimeout(() => this.exitoMsg.set(null), 3000);
            this.authService.usuario.set(usuarioActualizado);
            this.personalizacionStore.recargar();
            this.cdr.detectChanges();
          },
          error: () => {
            this.subiendoFoto.set(false);
            this.errorMsg.set('Error al actualizar la foto');
            this.safeTimeout(() => this.errorMsg.set(null), 3000);
          }
        });
    } catch (error) {
      if (isDevMode()) console.error('Error al procesar imagen:', error);
      this.errorMsg.set('Error al procesar la imagen');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
    } finally {
      input.value = '';
    }
  }

  private leerComoDataUrl(archivo: Blob): void {
    if (this.lectorActual) {
      try { this.lectorActual.abort(); } catch { /* noop */ }
    }
    const lector = new FileReader();
    this.lectorActual = lector;
    lector.onload = () => {
      const result = lector.result;
      if (typeof result === 'string') {
        // safeUrl acepta data:image/*;base64
        this.previsualizacion.set(safeUrl(result));
      }
      this.lectorActual = null;
    };
    lector.onerror = () => {
      this.lectorActual = null;
      this.errorMsg.set('No se pudo leer la imagen');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
    };
    lector.readAsDataURL(archivo);
  }

  abrirConfirmEliminarFoto(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para eliminar tu foto.');
      return;
    }
    this.mostrarConfirmEliminarFoto.set(true);
  }

  cerrarConfirmEliminarFoto(): void {
    if (this.eliminandoFoto()) return;
    this.mostrarConfirmEliminarFoto.set(false);
  }

  confirmarEliminarFoto(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para eliminar tu foto.');
      return;
    }
    this.eliminandoFoto.set(true);
    this.errorMsg.set(null);

    this.authService.eliminarFotoPerfil()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usuarioActualizado: User) => {
          this.eliminandoFoto.set(false);
          this.mostrarConfirmEliminarFoto.set(false);
          this.authService.usuario.set(usuarioActualizado);
          this.exitoMsg.set('Foto de perfil eliminada');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.eliminandoFoto.set(false);
          this.mostrarConfirmEliminarFoto.set(false);
          const mensaje = err?.error?.error || err?.error?.mensaje || 'Error al eliminar la foto';
          this.errorMsg.set(mensaje);
          this.safeTimeout(() => this.errorMsg.set(null), 4000);
        }
      });
  }

  // ============================================================
  // EDICION
  // ============================================================
  toggleEditar(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para editar tu perfil.');
      return;
    }
    this.editando.set(!this.editando());
    if (this.editando()) this.cargarDatosUsuario();
  }

  guardarCambios(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para guardar tu perfil.');
      return;
    }
    if (this.formEditar.invalid) {
      this.formEditar.markAllAsTouched();
      return;
    }

    const usuarioId = this.usuario()?.id;
    if (!usuarioId) return;

    this.cargando.set(true);
    const data = this.formEditar.getRawValue();

    this.userService.actualizarPerfil(usuarioId, {
      nombreUsuario: (data.nombreUsuario ?? '').trim(),
      email: (data.email ?? '').trim(),
      bio: (data.bio ?? '').trim()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (usuarioActualizado) => {
        this.authService.usuario.set(usuarioActualizado);
        this.cargando.set(false);
        this.exitoMsg.set('Perfil actualizado correctamente');
        this.editando.set(false);
        this.safeTimeout(() => this.exitoMsg.set(null), 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(err?.error?.error || 'Error al actualizar el perfil');
        this.safeTimeout(() => this.errorMsg.set(null), 4000);
      }
    });
  }

  // ============================================================
  // NAVEGACION
  // ============================================================
  irHistorialPublicaciones(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para ver tu historial.');
      return;
    }
    this.router.navigate(['/mis-publicaciones']);
  }

  irAlChat(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para entrar al chat.');
      return;
    }
    this.router.navigate(['/chat']);
  }

  irAjustes(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para acceder a los ajustes.');
      return;
    }
    this.router.navigate(['/ajustes']);
  }

  irABloqueados(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para ver bloqueados.');
      return;
    }
    this.router.navigate(['/ajustes'], { fragment: 'bloqueados' });
  }

  // ============================================================
  // LOGOUT (modal propio, sin confirm nativo)
  // ============================================================
  abrirConfirmLogout(): void {
    this.mostrarConfirmLogout.set(true);
  }

  cerrarConfirmLogout(): void {
    this.mostrarConfirmLogout.set(false);
  }

  confirmarLogout(): void {
    this.mostrarConfirmLogout.set(false);
    this.authService.logout();
  }
}