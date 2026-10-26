// src/app/shared/components/crear-grupo-modal/crear-grupo-modal.component.ts
import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GrupoService, Grupo } from '../../../core/services/grupo.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { AvisoLoginComponent } from '../aviso-login/aviso-login.component';

@Component({
  selector: 'kiert-crear-grupo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AvisoLoginComponent],
  templateUrl: './crear-grupo-modal.component.html',
  styleUrl: './crear-grupo-modal.component.scss'
})
export class CrearGrupoModalComponent {
  private grupoService = inject(GrupoService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @Output() cerrar = new EventEmitter<void>();
  @Output() creado = new EventEmitter<Grupo>();

  nombre = signal('');
  descripcion = signal('');
  readonly tipo: 'PRIVADO' = 'PRIVADO';

  usuariosSeleccionados = signal<Set<number>>(new Set());

  busquedaUsuario = signal('');
  resultados = signal<User[]>([]);
  buscando = signal(false);

  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  paso = signal<1 | 2>(1);

  // ✅ AVISO LOGIN
  mostrarAvisoLogin = signal(false);
  mensajeAvisoLogin = signal('Debes registrarte para crear un grupo.');

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

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

  buscarUsuarios(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para invitar usuarios.');
      return;
    }
    const query = this.busquedaUsuario().trim();
    if (query.length < 2) {
      this.resultados.set([]);
      return;
    }

    this.buscando.set(true);
    this.userService.buscarUsuarios(query).subscribe({
      next: (users) => {
        this.resultados.set(users);
        this.buscando.set(false);
      },
      error: () => this.buscando.set(false)
    });
  }

  toggleUsuario(userId: number): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para invitar usuarios.');
      return;
    }
    this.usuariosSeleccionados.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(userId)) nuevo.delete(userId);
      else nuevo.add(userId);
      return nuevo;
    });
  }

  estaSeleccionado(userId: number): boolean {
    return this.usuariosSeleccionados().has(userId);
  }

  siguientePaso(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para crear un grupo.');
      return;
    }
    if (!this.nombre().trim()) {
      this.errorMsg.set('El nombre es obligatorio');
      return;
    }
    this.errorMsg.set(null);
    this.paso.set(2);
  }

  volverPaso(): void {
    this.paso.set(1);
  }

  crear(): void {
    if (!this.estaLogueado) {
      this.abrirAvisoLogin('Debes registrarte para crear un grupo.');
      return;
    }
    this.enviando.set(true);
    this.errorMsg.set(null);

    this.grupoService.crearGrupo({
      nombre: this.nombre().trim(),
      descripcion: this.descripcion().trim(),
      tipo: this.tipo,
      usuariosInvitados: Array.from(this.usuariosSeleccionados())
    }).subscribe({
      next: (grupo) => {
        this.enviando.set(false);
        this.creado.emit(grupo);
        this.cerrar.emit();
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorMsg.set(err.error?.error || 'Error al crear grupo');
      }
    });
  }
}