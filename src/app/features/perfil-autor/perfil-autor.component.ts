// src/app/features/perfil-autor/perfil-autor.component.ts
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UserService } from '../../core/services/user.service';
import { BloqueoService, EstadoBloqueo } from '../../core/services/bloqueo.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { PersonalizacionService, Personalizacion } from '../../core/services/personalizacion.service';
import { User } from '../../core/models/user.model';
import { BloqueoModalComponent } from '../../shared/components/bloqueo-modal/bloqueo-modal.component';

type EstadoContacto = 'ninguno' | 'pendiente-enviada' | 'pendiente-recibida' | 'contacto';

@Component({
  selector: 'kiert-perfil-autor',
  standalone: true,
  imports: [CommonModule, BloqueoModalComponent],
  templateUrl: './perfil-autor.component.html',
  styleUrl: './perfil-autor.component.scss',
})
export class PerfilAutorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private bloqueoService = inject(BloqueoService);
  private personalizacionService = inject(PersonalizacionService);
  public personalizacionStore = inject(PersonalizacionStore);

  autor = signal<User | null>(null);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  esMiPerfil = signal(false);
  usuarioActual = this.authService.usuario;

  // ===== CONTACTO =====
  estadoContacto = signal<EstadoContacto>('ninguno');
  enviandoSolicitud = signal(false);
  procesando = signal(false);

  // ===== COMPATIBILIDAD CON HTML =====
  esContacto = computed(() => this.estadoContacto() === 'contacto');
  solicitudPendiente = computed(() =>
    this.estadoContacto() === 'pendiente-enviada' ||
    this.estadoContacto() === 'pendiente-recibida'
  );

  // ===== BLOQUEO =====
  estaBloqueado = signal(false);
  mostrarModalBloqueo = signal(false);
  bloqueoInfo = signal<EstadoBloqueo | null>(null);
  procesandoBloqueo = signal(false);

  // ===== PERSONALIZACIÓN DEL AUTOR =====
  autorPersonalizacion = signal<Personalizacion | null>(null);
  autorTemaId = signal<string>('default');
  autorMarcoId = signal<string>('none');
  autorFondoId = signal<string>('default');
  autorFotoPerfil = signal<string>('');
  autorFotoPortada = signal<string>('');

  // 🔥 Fondo del perfil del autor (solo se aplica a la tarjeta)
  get fondoPerfilDelAutor(): string {
    const fondoId = this.autorFondoId();
    const fondos = this.personalizacionStore.fondos();
    const encontrado = fondos.find(f => f.id === fondoId);
    return encontrado?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  }

  get marcoClaseDelAutor(): string { return `frame-${this.autorMarcoId()}`; }

  get marcoEstiloDelAutor(): any {
    const marcoId = this.autorMarcoId();
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

  get fotoPerfilDelAutor(): string {
    return this.autorFotoPerfil() || this.autor()?.fotoPerfilUrl || '';
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
      'star': '0 0 30px rgba(253,202,87,0.4)',
      'moon': '0 0 25px rgba(223,230,233,0.3)',
      'sun': '0 0 30px rgba(253,203,110,0.4)',
      'elite': '0 0 40px rgba(108,92,231,0.6)',
    };
    return map[marcoId] || 'none';
  }

  ngOnInit(): void {
    const userId = Number(this.route.snapshot.params['id']);
    const usuarioActual = this.usuarioActual();

    if (!userId || isNaN(userId)) {
      this.errorMsg.set('Usuario no válido');
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
    this.verificarEstadoContacto(userId);
    this.verificarBloqueo(userId);
  }

  cargarAutor(userId: number): void {
    this.cargando.set(true);
    this.userService.obtenerUsuarioPorId(userId).subscribe({
      next: (user) => {
        this.autor.set(user);
        if (user.fotoPerfilUrl) this.autorFotoPerfil.set(user.fotoPerfilUrl);
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar el perfil del usuario');
        this.cargando.set(false);
      }
    });
  }

  cargarPersonalizacionAutor(userId: number): void {
    this.personalizacionService.obtenerPersonalizacionPorUsuario(userId).subscribe({
      next: (data: Personalizacion) => {
        this.autorPersonalizacion.set(data);
        this.autorTemaId.set(data?.temaId || 'default');
        this.autorMarcoId.set(data?.marcoId || 'none');
        this.autorFondoId.set(data?.fondoId || 'default');
        if (data?.fotoPerfilUrl) this.autorFotoPerfil.set(data.fotoPerfilUrl);
        if (data?.fotoPortadaUrl) this.autorFotoPortada.set(data.fotoPortadaUrl);
      },
      error: () => this.autorPersonalizacion.set(null)
    });
  }

  // ===== VERIFICAR CONTACTO =====
  verificarEstadoContacto(userId: number): void {
    this.chatService.sonContactos(userId).subscribe({
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
    this.chatService.listarSolicitudes().subscribe({
      next: (recibidas) => {
        const recibida = recibidas.find(s =>
          s.usuarioId === userId && s.estado === 'PENDIENTE'
        );

        if (recibida) {
          this.estadoContacto.set('pendiente-recibida');
          return;
        }

        this.chatService.listarSolicitudesEnviadas().subscribe({
          next: (enviadas) => {
            const enviada = enviadas.find(s =>
              s.usuarioId === userId && s.estado === 'PENDIENTE'
            );

            if (enviada) {
              this.estadoContacto.set('pendiente-enviada');
              return;
            }

            this.estadoContacto.set('ninguno');
          },
          error: () => this.estadoContacto.set('ninguno')
        });
      },
      error: () => this.estadoContacto.set('ninguno')
    });
  }

  // ===== BLOQUEO =====
  verificarBloqueo(userId: number): void {
    this.bloqueoService.verificarEstado(userId).subscribe({
      next: (estado) => {
        this.estaBloqueado.set(estado.bloqueado);
        this.bloqueoInfo.set(estado);
      },
      error: () => this.estaBloqueado.set(false)
    });
  }

  abrirModalBloqueo(): void { this.mostrarModalBloqueo.set(true); }
  cerrarModalBloqueo(): void { this.mostrarModalBloqueo.set(false); }

  onUsuarioBloqueado(): void {
    this.estaBloqueado.set(true);
    this.exitoMsg.set('Usuario bloqueado correctamente');
    setTimeout(() => this.exitoMsg.set(null), 3000);
    const userId = this.autor()?.id;
    if (userId) this.verificarBloqueo(userId);
  }

  desbloquear(): void {
    if (!confirm('¿Desbloquear a este usuario?')) return;
    const userId = this.autor()?.id;
    if (!userId) return;

    this.procesandoBloqueo.set(true);
    this.bloqueoService.desbloquear(userId).subscribe({
      next: () => {
        this.procesandoBloqueo.set(false);
        this.estaBloqueado.set(false);
        this.bloqueoInfo.set(null);
        this.exitoMsg.set('Usuario desbloqueado correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
        this.verificarEstadoContacto(userId);
      },
      error: () => {
        this.procesandoBloqueo.set(false);
        this.errorMsg.set('Error al desbloquear usuario');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ===== ACCIONES DE CONTACTO =====
  enviarSolicitud(): void {
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.enviandoSolicitud.set(true);
    this.chatService.enviarSolicitud(autorId).subscribe({
      next: () => {
        this.estadoContacto.set('pendiente-enviada');
        this.enviandoSolicitud.set(false);
        this.exitoMsg.set('Solicitud enviada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: (err) => {
        this.enviandoSolicitud.set(false);
        const mensaje = err?.error?.mensaje || err?.error?.error || 'Error al enviar solicitud';
        this.errorMsg.set(mensaje);

        if (mensaje.toLowerCase().includes('ya enviaste')) {
          this.estadoContacto.set('pendiente-enviada');
        } else if (mensaje.toLowerCase().includes('ya te envió')) {
          this.estadoContacto.set('pendiente-recibida');
        } else if (mensaje.toLowerCase().includes('ya son contactos')) {
          this.estadoContacto.set('contacto');
        }

        setTimeout(() => this.errorMsg.set(null), 5000);
      }
    });
  }

  aceptarSolicitudRecibida(): void {
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.chatService.listarSolicitudes().subscribe({
      next: (solicitudes) => {
        const solicitud = solicitudes.find(s =>
          s.usuarioId === autorId && s.estado === 'PENDIENTE'
        );

        if (!solicitud) {
          this.errorMsg.set('No se encontró la solicitud');
          setTimeout(() => this.errorMsg.set(null), 3000);
          return;
        }

        this.procesando.set(true);
        this.chatService.aceptarSolicitud(solicitud.id).subscribe({
          next: () => {
            this.procesando.set(false);
            this.estadoContacto.set('contacto');
            this.exitoMsg.set('¡Solicitud aceptada! Ya pueden chatear');
            setTimeout(() => this.exitoMsg.set(null), 3000);
          },
          error: (err) => {
            this.procesando.set(false);
            this.errorMsg.set(err?.error?.mensaje || 'Error al aceptar solicitud');
            setTimeout(() => this.errorMsg.set(null), 3000);
          }
        });
      }
    });
  }

  irAlChat(): void {
    if (this.estadoContacto() !== 'contacto') {
      this.errorMsg.set('Primero deben ser contactos');
      setTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }

    const autorId = this.autor()?.id;
    if (autorId) this.router.navigate(['/chat', autorId]);
  }

  volver(): void {
    this.router.navigate(['/comunidad']);
  }
}