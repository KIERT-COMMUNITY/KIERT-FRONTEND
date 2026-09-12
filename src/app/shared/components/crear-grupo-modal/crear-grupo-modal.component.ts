import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GrupoService, Grupo } from '../../../core/services/grupo.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'kiert-crear-grupo-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-grupo-modal.component.html',
  styleUrl: './crear-grupo-modal.component.scss'
})
export class CrearGrupoModalComponent {
  private grupoService = inject(GrupoService);
  private userService = inject(UserService);

  @Output() cerrar = new EventEmitter<void>();
  @Output() creado = new EventEmitter<Grupo>();

  // ===== FORMULARIO =====
  nombre = signal('');
  descripcion = signal('');
  tipo = signal<'PRIVADO' | 'PUBLICO'>('PRIVADO');
  usuariosSeleccionados = signal<Set<number>>(new Set());

  // ===== BÚSQUEDA =====
  busquedaUsuario = signal('');
  resultados = signal<User[]>([]);
  buscando = signal(false);

  // ===== ESTADO =====
  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  paso = signal<1 | 2>(1); // Paso 1: info, Paso 2: miembros

  buscarUsuarios(): void {
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
      error: () => {
        this.buscando.set(false);
      }
    });
  }

  toggleUsuario(userId: number): void {
    this.usuariosSeleccionados.update(set => {
      const nuevo = new Set(set);
      if (nuevo.has(userId)) {
        nuevo.delete(userId);
      } else {
        nuevo.add(userId);
      }
      return nuevo;
    });
  }

  estaSeleccionado(userId: number): boolean {
    return this.usuariosSeleccionados().has(userId);
  }

  siguientePaso(): void {
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
    this.enviando.set(true);
    this.errorMsg.set(null);

    this.grupoService.crearGrupo({
      nombre: this.nombre().trim(),
      descripcion: this.descripcion().trim(),
      tipo: this.tipo(),
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