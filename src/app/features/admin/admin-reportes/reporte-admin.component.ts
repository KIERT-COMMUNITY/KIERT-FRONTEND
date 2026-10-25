// src/app/features/admin/reporte-admin.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReporteService, Reporte, ReporteResumen } from '../../../core/services/reporte.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

@Component({
  selector: 'kiert-reportes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-admin.component.html',
  styleUrl: './reporte-admin.component.scss'
})
export class ReportesAdminComponent implements OnInit {
  private reporteService = inject(ReporteService);
  private router = inject(Router);
  public adminAuth = inject(AdminAuthService);

  reportes = signal<Reporte[]>([]);
  resumen = signal<ReporteResumen | null>(null);
  cargando = signal(true);
  errorMsg = signal<string | null>(null);

  filtroEstado = '';
  filtroTipo = '';
  acciones: Record<number, string> = {};
  notas: Record<number, string> = {};

  ngOnInit(): void {
    // Validar sesión al entrar
    if (!this.adminAuth.estaLogueado()) {
      this.router.navigate(['/admin/login']);
      return;
    }

    this.cargar();
    this.cargarResumen();
  }

  // LOGOUT — usa el nuevo método que limpia Y navega
  logout(): void {
    if (confirm('¿Cerrar sesión de administrador?')) {
      this.adminAuth.logoutYNavegar();
    }
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.reporteService.listarReportes(this.filtroEstado, this.filtroTipo).subscribe({
      next: (res: any) => {
        this.reportes.set(res.content || res || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar reportes:', err);
        // Si token expiró → logout automático
        if (err.status === 401 || err.status === 403) {
          this.adminAuth.logoutYNavegar();
          return;
        }
        this.errorMsg.set('Error al cargar reportes');
        this.cargando.set(false);
      }
    });
  }

  cargarResumen(): void {
    this.reporteService.obtenerResumen().subscribe({
      next: (res) => this.resumen.set(res),
      error: () => {
        this.resumen.set({
          totalPendientes: 0,
          totalRevisando: 0,
          totalResueltos: 0,
          totalRechazados: 0
        });
      }
    });
  }

  resolver(id: number, estado: string): void {
    if (!confirm(`¿Marcar este reporte como ${estado}?`)) return;

    this.reporteService.actualizarReporte(id, {
      estado,
      notaModerador: this.notas[id] || '',
      accionTomada: this.acciones[id] || 'NINGUNA'
    }).subscribe({
      next: () => {
        this.cargar();
        this.cargarResumen();
      },
      error: (err) => {
        console.error('Error al actualizar reporte:', err);
        if (err.status === 401 || err.status === 403) {
          this.adminAuth.logoutYNavegar();
          return;
        }
        alert('Error al actualizar el reporte');
      }
    });
  }

  getBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      'PENDIENTE': 'badge-pendiente',
      'REVISANDO': 'badge-revisando',
      'RESUELTO': 'badge-resuelto',
      'RECHAZADO': 'badge-rechazado'
    };
    return map[estado] || 'badge-default';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMotivoLabel(motivo: string): string {
    const map: Record<string, string> = {
      'SPAM': 'Spam',
      'ACOSO': 'Acoso',
      'CONTENIDO_INAPROPIADO': 'Contenido inapropiado',
      'VIOLENCIA': 'Violencia',
      'DERECHOS_AUTOR': 'Derechos de autor',
      'INFORMACION_FALSA': 'Info falsa',
      'OTRO': 'Otro'
    };
    return map[motivo] || motivo;
  }
}