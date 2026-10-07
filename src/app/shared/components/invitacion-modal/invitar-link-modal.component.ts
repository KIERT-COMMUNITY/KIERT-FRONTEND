import { Component, EventEmitter, Input, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeComponent } from 'angularx-qrcode';
import { GrupoService, InvitacionLink } from '../../../core/services/grupo.service';

@Component({
  selector: 'kiert-invitar-link-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, QRCodeComponent],
  templateUrl: './invitar-link-modal.component.html',
  styleUrl: './invitar-link-modal.component.scss'
})
export class InvitarLinkModalComponent implements OnInit {
  private grupoService = inject(GrupoService);

  @Input() grupoId!: number;
  @Input() grupoNombre!: string;
  @Output() cerrar = new EventEmitter<void>();

  // ===== ESTADO =====
  links = signal<InvitacionLink[]>([]);
  cargando = signal(false);
  generando = signal(false);
  errorMsg = signal<string | null>(null);
  copiado = signal<string | null>(null);
  mostrarQR = signal<string | null>(null);

  // ===== CONFIGURACIÓN =====
  usosMaximos = signal<number>(0);       // 0 = ilimitado
  horasExpiracion = signal<number>(168); // 7 días
  opcionExpiracion = signal<'1h' | '24h' | '7d' | '30d' | 'nunca'>('7d');
  opcionUsos = signal<'ilimitado' | '1' | '5' | '10' | '50'>('ilimitado');

  ngOnInit(): void {
    this.cargarLinks();
  }

  cargarLinks(): void {
    this.cargando.set(true);
    this.grupoService.listarLinksInvitacion(this.grupoId).subscribe({
      next: (links) => {
        this.links.set(links);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  // ===== CONFIG HELPERS =====
  aplicarOpcionExpiracion(opcion: '1h' | '24h' | '7d' | '30d' | 'nunca'): void {
    this.opcionExpiracion.set(opcion);
    const map: Record<string, number> = {
      '1h': 1,
      '24h': 24,
      '7d': 168,
      '30d': 720,
      'nunca': 0
    };
    this.horasExpiracion.set(map[opcion]);
  }

  aplicarOpcionUsos(opcion: 'ilimitado' | '1' | '5' | '10' | '50'): void {
    this.opcionUsos.set(opcion);
    const map: Record<string, number> = {
      'ilimitado': 0,
      '1': 1,
      '5': 5,
      '10': 10,
      '50': 50
    };
    this.usosMaximos.set(map[opcion]);
  }

  // ===== GENERAR LINK =====
  generarLink(): void {
    this.generando.set(true);
    this.errorMsg.set(null);

    this.grupoService.generarLinkInvitacion(this.grupoId, {
      usosMaximos: this.usosMaximos(),
      horasExpiracion: this.horasExpiracion()
    }).subscribe({
      next: (link) => {
        this.links.update(lista => [link, ...lista]);
        this.generando.set(false);
        this.copiado.set(link.urlInvitacion);
        navigator.clipboard.writeText(link.urlInvitacion).catch(() => {});
        setTimeout(() => this.copiado.set(null), 2500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.error || 'Error al generar link');
        this.generando.set(false);
      }
    });
  }

  // ===== ACCIONES =====
  copiarLink(url: string): void {
    navigator.clipboard.writeText(url).then(() => {
      this.copiado.set(url);
      setTimeout(() => this.copiado.set(null), 2000);
    });
  }

  compartirWhatsApp(url: string): void {
    const texto = encodeURIComponent(
      `¡Únete al grupo "${this.grupoNombre}" en Kiert! 👥\n\n${url}`
    );
    window.open(`https://wa.me/?text=${texto}`, '_blank');
  }

  compartirTelegram(url: string): void {
    const texto = encodeURIComponent(`¡Únete al grupo "${this.grupoNombre}" en Kiert!`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${texto}`, '_blank');
  }

  compartirEmail(url: string): void {
    const subject = encodeURIComponent(`Invitación al grupo "${this.grupoNombre}"`);
    const body = encodeURIComponent(`¡Hola!\n\nTe invito a unirte al grupo "${this.grupoNombre}" en Kiert.\n\n${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  mostrarQRCode(url: string): void {
    this.mostrarQR.set(url);
  }

  cerrarQR(): void {
    this.mostrarQR.set(null);
  }

  desactivarLink(linkId: number): void {
    if (!confirm('¿Desactivar este link? Ya no podrá usarse para unirse.')) return;

    this.grupoService.desactivarLink(linkId).subscribe({
      next: () => {
        this.links.update(lista =>
          lista.map(l => l.id === linkId ? { ...l, activo: false } : l)
        );
      }
    });
  }

  // ===== HELPERS =====
  formatearFecha(fecha: string | null): string {
    if (!fecha) return 'Nunca';
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  getTextoExpiracion(link: InvitacionLink): string {
    if (!link.expiraEn) return 'Sin expiración';
    const diff = new Date(link.expiraEn).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const horas = Math.floor(diff / 3600000);
    if (horas < 24) return `Expira en ${horas}h`;
    const dias = Math.floor(horas / 24);
    return `Expira en ${dias}d`;
  }

  getTextoUsos(link: InvitacionLink): string {
    if (link.usosMaximos === 0) {
      return `${link.usosActuales} usos · ilimitado`;
    }
    return `${link.usosActuales}/${link.usosMaximos} usos`;
  }
}