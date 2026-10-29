// src/app/features/perfil-autor/perfil-autor.component.ts
import { Component, OnInit, OnDestroy, signal, computed, inject, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { UserService } from '../../../core/services/user.service';
import { BloqueoService, EstadoBloqueo } from '../../../core/services/bloqueo.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { PersonalizacionService, Personalizacion } from '../../../core/services/personalizacion.service';
import { User } from '../../../core/models/user.model';
import { BloqueoModalComponent } from '../../../shared/components/bloqueo-modal/bloqueo-modal.component';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import {
  safeUrl, safeBackgroundImage, safeCssGradient, safeFrameToken
} from '../../../shared/utils/url-sanitizer';

type EstadoContacto = 'ninguno' | 'pendiente-enviada' | 'pendiente-recibida' | 'contacto';
type ErrorTipo = 'eliminada' | 'bloqueada' | 'restringida' | 'error' | 'invalido' | null;

@Component({
  selector: 'kiert-perfil-autor',
  standalone: true,
  imports: [CommonModule, BloqueoModalComponent, AvisoLoginComponent],
  templateUrl: './perfil-autor.component.html',
  styleUrl: './perfil-autor.component.scss',
})
export class PerfilAutorComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private bloqueoService = inject(BloqueoService);
  private personalizacionService = inject(PersonalizacionService);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  // ===== ESTADO =====
  autor = signal<User | null>(null);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  errorTipo = signal<ErrorTipo>(null);
  exitoMsg = signal<string | null>(null);
  esMiPerfil = signal(false);
  usuarioActual = this.authService.usuario;

  estadoContacto = signal<EstadoContacto>('ninguno');
  enviandoSolicitud = signal(false);
  procesando = signal(false);

  esContacto = computed(() => this.estadoContacto() === 'contacto');
  solicitudPendiente = computed(() =>
    this.estadoContacto() === 'pendiente-enviada' ||
    this.estadoContacto() === 'pendiente-recibida'
  );

  estaBloqueado = signal(false);
  mostrarModalBloqueo = signal(false);
  bloqueoInfo = signal<EstadoBloqueo | null>(null);
  procesandoBloqueo = signal(false);

  // Modal de desbloqueo propio (sin confirm nativo)
  mostrarConfirmDesbloqueo = signal(false);

  // ===== PERSONALIZACION DEL AUTOR =====
  autorPersonalizacion = signal<Personalizacion | null>(null);
  autorTemaId = signal<string>('default');
  autorMarcoId = signal<string>('none');
  autorFondoId = signal<string>('default');
  autorFotoPerfil = signal<string>('');
  autorFotoPortada = signal<string>('');

  // ===== AVISO LOGIN =====
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para interactuar con este usuario.');

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  // ===== COMPUTED SEGUROS PARA EL TEMPLATE =====

  /** Fondo del contenedor principal, saneado. */
  fondoPerfilDelAutorSeguro = computed<string>(() => {
    const fondoId = this.autorFondoId();
    const fondos = this.personalizacionStore.fondos();
    const encontrado = fondos.find(f => f.id === fondoId);
    return safeCssGradient(encontrado?.gradiente);
  });

  /** Clase de marco saneada. */
  marcoClaseDelAutorSeguro = computed<string>(() =>
    'frame-' + safeFrameToken(this.autorMarcoId(), 'none')
  );

  /** Estilo de marco saneado (objeto listo para [ngStyle]). */
 marcoEstiloDelAutorSeguro = computed<Record<string, string | undefined>>(() => {
    const marcoId = safeFrameToken(this.autorMarcoId(), 'none');
    const gradientFrames = ['rainbow', 'pastel', 'ocean', 'sunset', 'galaxy', 'fire', 'ice', 'rose', 'crystal'];

    if (gradientFrames.includes(marcoId)) {
      const marcoData = this.personalizacionStore.marcosData().find(m => m.id === marcoId);
      const gradiente = safeCssGradient(marcoData?.gradient);
      return {
        'border': '4px solid transparent',
        'background-image': gradiente,
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
  });

  /** URL de foto del autor saneada. */
  fotoPerfilDelAutorSeguro = computed<string | null>(() => {
    const autor = this.autor();
    if (!autor) return null;

    const fotoUsuario = autor.fotoPerfilUrl;
    if (fotoUsuario && fotoUsuario.trim() !== '') return safeUrl(fotoUsuario);

    const fotoPers = this.autorFotoPerfil();
    return safeUrl(fotoPers);
  });

  /** Background-image del banner, saneado. */
  bannerDelAutorSeguro = computed<string>(() => {
    const portada = this.autorFotoPortada();
    if (!portada) return 'none';
    return safeBackgroundImage(portada);
  });

  /** true si hay banner que pintar. */
  tieneBanner = computed<boolean>(() => this.bannerDelAutorSeguro() !== 'none');

  // ===== HELPERS DE MARCO =====

  getMarcoBorder(marcoId: string): string {
    const safe = safeFrameToken(marcoId, 'none');
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
    return map[safe] || '4px solid #2dd4bf';
  }

  getMarcoShadow(marcoId: string): string {
    const safe = safeFrameToken(marcoId, 'none');
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
      'star': '0 0 30px rgba(253,202,87,0.4)',
      'moon': '0 0 25px rgba(223,230,233,0.3)',
      'sun': '0 0 30px rgba(253,203,110,0.4)',
      'elite': '0 0 40px rgba(108,92,231,0.6)',
    };
    return map[safe] || 'none';
  }

  // ============================================================
  // CICLO DE VIDA
  // ============================================================
  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    const userId = Number(idParam);
    const usuarioActual = this.usuarioActual();

    if (!idParam || !Number.isFinite(userId) || userId <= 0 || !Number.isInteger(userId)) {
      this.errorTipo.set('invalido');
      this.errorMsg.set('Usuario no valido');
      this.cargando.set(false);
      return;
    }

    if (usuarioActual && usuarioActual.id === userId) {
      this.esMiPerfil.set(true);
      this.router.navigate(['/perfil']);
      return;
    }

    this.cargarAutor(userId);
    this.cargarPersonalizacionAutor(userId);

    if (this.estaLogueado) {
      this.verificarEstadoContacto(userId);
      this.verificarBloqueo(userId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  // ============================================================
  // AVISO LOGIN
  // ============================================================
  abrirAvisoLogin(mensaje: string): void {
    this.mensajeAvisoLogin.set(mensaje);
    this.mostrarAvisoLogin.set(true);
  }

  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: this.router.url }
    });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  // ============================================================
  // CARGA
  // ============================================================
  cargarAutor(userId: number): void {
    this.cargando.set(true);
    this.errorMsg.set(null);
    this.errorTipo.set(null);

    this.userService.obtenerUsuarioPorId(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          this.autor.set(user);
          this.autorFotoPerfil.set(user.fotoPerfilUrl || '');
          this.cargando.set(false);
        },
        error: (err) => {
          const status = err?.status;

          if (status === 404) {
            this.errorTipo.set('eliminada');
            this.errorMsg.set('Cuenta eliminada');
          } else if (status === 403) {
            this.errorTipo.set('bloqueada');
            this.errorMsg.set('Cuenta bloqueada');
          } else if (status === 401) {
            this.errorTipo.set('restringida');
            this.errorMsg.set('Acceso restringido');
          } else {
            this.errorTipo.set('error');
            this.errorMsg.set('No se pudo cargar el perfil');
          }

          if (isDevMode()) console.error('[perfil-autor] Error cargando autor', status);
          this.cargando.set(false);
        }
      });
  }

  cargarPersonalizacionAutor(userId: number): void {
    this.personalizacionService.obtenerPersonalizacionPorUsuario(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Personalizacion) => {
          this.autorPersonalizacion.set(data);
          this.autorTemaId.set(safeFrameToken(data?.temaId, 'default'));
          this.autorMarcoId.set(safeFrameToken(data?.marcoId, 'none'));
          this.autorFondoId.set(safeFrameToken(data?.fondoId, 'default'));
          if (data?.fotoPortadaUrl) {
            this.autorFotoPortada.set(data.fotoPortadaUrl);
          }
        },
        error: () => this.autorPersonalizacion.set(null)
      });
  }

  verificarEstadoContacto(userId: number): void {
    this.chatService.sonContactos(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const sonContactos = res?.sonContactos === true || res === true;
          if (sonContactos) {
            this.estadoContacto.set('contacto');
            return;
          }
          this.verificarSolicitudesPendientes(userId);
        },
        error: () => this.verificarSolicitudesPendientes(userId)
      });
  }

  private verificarSolicitudesPendientes(userId: number): void {
    this.chatService.listarSolicitudes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recibidas) => {
          const recibida = recibidas.find(s =>
            s.usuarioId === userId && s.estado === 'PENDIENTE'
          );
          if (recibida) {
            this.estadoContacto.set('pendiente-recibida');
            return;
          }
          this.chatService.listarSolicitudesEnviadas()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (enviadas) => {
                const enviada = enviadas.find(s =>
                  s.usuarioId === userId && s.estado === 'PENDIENTE'
                );
                this.estadoContacto.set(enviada ? 'pendiente-enviada' : 'ninguno');
              },
              error: () => this.estadoContacto.set('ninguno')
            });
        },
        error: () => this.estadoContacto.set('ninguno')
      });
  }

  verificarBloqueo(userId: number): void {
    this.bloqueoService.verificarEstado(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (estado) => {
          this.estaBloqueado.set(estado.bloqueado);
          this.bloqueoInfo.set(estado);
        },
        error: () => this.estaBloqueado.set(false)
      });
  }

  // ============================================================
  // BLOQUEO / DESBLOQUEO
  // ============================================================
  abrirModalBloqueo(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para bloquear usuarios.');
      return;
    }
    this.mostrarModalBloqueo.set(true);
  }

  cerrarModalBloqueo(): void { this.mostrarModalBloqueo.set(false); }

  onUsuarioBloqueado(): void {
    this.estaBloqueado.set(true);
    this.exitoMsg.set('Usuario bloqueado correctamente');
    this.safeTimeout(() => this.exitoMsg.set(null), 3000);
    const userId = this.autor()?.id;
    if (userId) this.verificarBloqueo(userId);
  }

  // Modal propio en vez de confirm()
  abrirConfirmDesbloqueo(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para desbloquear usuarios.');
      return;
    }
    this.mostrarConfirmDesbloqueo.set(true);
  }

  cerrarConfirmDesbloqueo(): void {
    if (this.procesandoBloqueo()) return;
    this.mostrarConfirmDesbloqueo.set(false);
  }

  confirmarDesbloqueo(): void {
    const userId = this.autor()?.id;
    if (!userId) return;

    this.procesandoBloqueo.set(true);
    this.bloqueoService.desbloquear(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.procesandoBloqueo.set(false);
          this.mostrarConfirmDesbloqueo.set(false);
          this.estaBloqueado.set(false);
          this.bloqueoInfo.set(null);
          this.exitoMsg.set('Usuario desbloqueado correctamente');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
          this.verificarEstadoContacto(userId);
        },
        error: () => {
          this.procesandoBloqueo.set(false);
          this.mostrarConfirmDesbloqueo.set(false);
          this.errorMsg.set('Error al desbloquear usuario');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ============================================================
  // SOLICITUDES
  // ============================================================
  enviarSolicitud(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para enviar solicitudes de contacto.');
      return;
    }
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.enviandoSolicitud.set(true);
    this.chatService.enviarSolicitud(autorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.estadoContacto.set('pendiente-enviada');
          this.enviandoSolicitud.set(false);
          this.exitoMsg.set('Solicitud enviada correctamente');
          this.safeTimeout(() => this.exitoMsg.set(null), 3000);
        },
        error: (err) => {
          this.enviandoSolicitud.set(false);
          const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar solicitud';
          this.errorMsg.set(mensaje);

          // Match por prefijo/codigo, no por substring arbitrario
          const codigo: string = err?.error?.code || '';
          if (codigo === 'ALREADY_SENT' || /^ya enviaste/i.test(mensaje)) {
            this.estadoContacto.set('pendiente-enviada');
          } else if (codigo === 'ALREADY_RECEIVED' || /^ya te envio/i.test(mensaje)) {
            this.estadoContacto.set('pendiente-recibida');
          } else if (codigo === 'ALREADY_CONTACTS' || /^ya son contactos/i.test(mensaje)) {
            this.estadoContacto.set('contacto');
          }

          this.safeTimeout(() => this.errorMsg.set(null), 5000);
        }
      });
  }

  aceptarSolicitudRecibida(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para aceptar solicitudes.');
      return;
    }
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.chatService.listarSolicitudes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (solicitudes) => {
          const solicitud = solicitudes.find(s =>
            s.usuarioId === autorId && s.estado === 'PENDIENTE'
          );
          if (!solicitud) {
            this.errorMsg.set('No se encontro la solicitud');
            this.safeTimeout(() => this.errorMsg.set(null), 3000);
            return;
          }

          this.procesando.set(true);
          this.chatService.aceptarSolicitud(solicitud.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.procesando.set(false);
                this.estadoContacto.set('contacto');
                this.exitoMsg.set('Solicitud aceptada. Ya pueden chatear');
                this.safeTimeout(() => this.exitoMsg.set(null), 3000);
              },
              error: (err) => {
                this.procesando.set(false);
                this.errorMsg.set(err?.error?.mensaje || 'Error al aceptar solicitud');
                this.safeTimeout(() => this.errorMsg.set(null), 3000);
              }
            });
        },
        error: () => {
          this.errorMsg.set('Error al buscar la solicitud');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ============================================================
  // NAVEGACION
  // ============================================================
  irAlChat(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para chatear en privado.');
      return;
    }
    if (this.estadoContacto() !== 'contacto') {
      this.errorMsg.set('Primero deben ser contactos');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    const autorId = this.autor()?.id;
    if (autorId) this.router.navigate(['/chat', autorId]);
  }

  volver(): void {
    this.router.navigate(['/comunidad']);
  }
}