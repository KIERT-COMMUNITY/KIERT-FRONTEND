// src/app/features/chat/unirse-por-link/unirse-por-link.component.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface InfoInvitacion {
  valida: boolean;
  mensaje: string;
  grupoId: number | null;
  grupoNombre: string | null;
  grupoDescripcion: string | null;
  grupoFoto: string | null;
  creadorNombre: string | null;
  totalMiembros: number | null;
  expiraEn: string | null;
}

@Component({
  selector: 'kiert-unirse-por-link',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unirse-por-link.component.html',
  styleUrl: './unirse-por-link.component.scss'
})
export class UnirsePorLinkComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private token: string | null = null;

  cargando = signal(true);
  uniendose = signal(false);
  info = signal<InfoInvitacion | null>(null);

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token');
    if (!this.token) {
      this.router.navigate(['/']);
      return;
    }
    this.cargarInfo();
  }

  estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  cargarInfo(): void {
    this.http.get<InfoInvitacion>(`${environment.apiUrl}/grupos/invitacion/${this.token}`)
      .subscribe({
        next: (data) => {
          this.info.set(data);
          this.cargando.set(false);
        },
        error: () => {
          this.info.set({ 
            valida: false, 
            mensaje: 'El link no existe o ha expirado.', 
            grupoId: null, 
            grupoNombre: null, 
            grupoDescripcion: null, 
            grupoFoto: null, 
            creadorNombre: null, 
            totalMiembros: null, 
            expiraEn: null 
          });
          this.cargando.set(false);
        }
      });
  }

  unirse(): void {
    this.uniendose.set(true);
    this.http.post(`${environment.apiUrl}/grupos/invitacion/${this.token}/unirse`, {}).subscribe({
      next: () => {
        this.router.navigate(['/chat/grupo', this.info()?.grupoId]);
      },
      error: (err) => {
        alert(err?.error?.error || 'Error al unirse al grupo');
        this.uniendose.set(false);
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: `/invitacion/${this.token}` } });
  }

  irAlInicio(): void {
    this.router.navigate(['/']);
  }
}