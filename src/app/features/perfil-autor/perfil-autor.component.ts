import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { UserService } from '../../core/services/user.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { PersonalizacionService, Personalizacion } from '../../core/services/personalizacion.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'kiert-perfil-autor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil-autor.component.html',
  styleUrl: './perfil-autor.component.scss',
})
export class PerfilAutorComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private chatService = inject(ChatService);
  private userService = inject(UserService);
  private personalizacionService = inject(PersonalizacionService);
  public personalizacionStore = inject(PersonalizacionStore);

  autor = signal<User | null>(null);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  esContacto = signal(false);
  solicitudPendiente = signal(false);
  enviandoSolicitud = signal(false);
  esMiPerfil = signal(false);
  usuarioActual = this.authService.usuario;

  // ✅ PERSONALIZACIÓN DEL AUTOR VISITADO
  autorPersonalizacion = signal<Personalizacion | null>(null);
  autorTemaId = signal<string>('default');
  autorMarcoId = signal<string>('none');
  autorFondoId = signal<string>('default');
  autorFotoPerfil = signal<string>('');
  autorFotoPortada = signal<string>('');

  // ✅ FONDO DE PERFIL DEL AUTOR (para el contenedor y la tarjeta)
  get fondoPerfilDelAutor(): string {
    const fondoId = this.autorFondoId();
    const fondos = this.personalizacionStore.fondos();
    const encontrado = fondos.find(f => f.id === fondoId);
    return encontrado?.gradiente || 'linear-gradient(135deg, #0d1117, #161b22)';
  }

  // ✅ TEMA DEL AUTOR
  get temaClassDelAutor(): string {
    const tema = this.autorTemaId();
    return `tema-${tema}`;
  }

  // ✅ MARCO DEL AUTOR
  get marcoClaseDelAutor(): string {
    const marco = this.autorMarcoId();
    return `frame-${marco}`;
  }

  // ✅ ESTILO DEL MARCO DEL AUTOR
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

  // ✅ FOTO DE PERFIL DEL AUTOR
  get fotoPerfilDelAutor(): string {
    return this.autorFotoPerfil() || this.autor()?.fotoPerfilUrl || '';
  }

  // ✅ MÉTODOS AUXILIARES PARA MARCOS
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
  }

  cargarAutor(userId: number): void {
    this.cargando.set(true);
    this.userService.obtenerUsuarioPorId(userId).subscribe({
      next: (user) => {
        this.autor.set(user);
        if (user.fotoPerfilUrl) {
          this.autorFotoPerfil.set(user.fotoPerfilUrl);
        }
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar el perfil del usuario');
        this.cargando.set(false);
      }
    });
  }

  // ✅ CARGAR LA PERSONALIZACIÓN DEL AUTOR
  cargarPersonalizacionAutor(userId: number): void {
    this.personalizacionService.obtenerPersonalizacionPorUsuario(userId).subscribe({
      next: (data: Personalizacion) => {
        this.autorPersonalizacion.set(data);
        this.autorTemaId.set(data?.temaId || 'default');
        this.autorMarcoId.set(data?.marcoId || 'none');
        this.autorFondoId.set(data?.fondoId || 'default');
        if (data?.fotoPerfilUrl) {
          this.autorFotoPerfil.set(data.fotoPerfilUrl);
        }
        if (data?.fotoPortadaUrl) {
          this.autorFotoPortada.set(data.fotoPortadaUrl);
        }
        console.log('🎨 Personalización del autor:', {
          tema: this.autorTemaId(),
          marco: this.autorMarcoId(),
          fondo: this.autorFondoId(),
          foto: this.autorFotoPerfil()
        });
      },
      error: (err) => {
        console.error('Error al cargar personalización del autor:', err);
        this.autorPersonalizacion.set(null);
      }
    });
  }

  verificarEstadoContacto(userId: number): void {
    this.chatService.sonContactos(userId).subscribe({
      next: (sonContactos) => this.esContacto.set(sonContactos),
      error: () => this.esContacto.set(false)
    });

    this.chatService.listarSolicitudes().subscribe({
      next: (solicitudes) => {
        const pendiente = solicitudes.some(s => 
          s.usuarioId === userId && s.estado === 'PENDIENTE'
        );
        this.solicitudPendiente.set(pendiente);
      },
      error: () => this.solicitudPendiente.set(false)
    });
  }

  enviarSolicitud(): void {
    const autorId = this.autor()?.id;
    if (!autorId) return;

    this.enviandoSolicitud.set(true);
    this.chatService.enviarSolicitud(autorId).subscribe({
      next: () => {
        this.solicitudPendiente.set(true);
        this.enviandoSolicitud.set(false);
        this.exitoMsg.set('Solicitud enviada correctamente');
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: () => {
        this.enviandoSolicitud.set(false);
        this.errorMsg.set('Error al enviar solicitud');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  irAlChat(): void {
    const autorId = this.autor()?.id;
    if (autorId) {
      this.router.navigate(['/chat', autorId]);
    }
  }

  volver(): void {
    this.router.navigate(['/comunidad']);
  }
}