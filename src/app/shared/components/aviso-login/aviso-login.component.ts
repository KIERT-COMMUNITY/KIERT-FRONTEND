// src/app/shared/components/aviso-login/aviso-login.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-aviso-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aviso-login.component.html',
  styleUrl: './aviso-login.component.scss'
})
export class AvisoLoginComponent {
  /** Controla si se muestra el aviso */
  @Input() visible = false;

  /** Título del aviso */
  @Input() titulo = 'Debes registrarte';

  /** Mensaje secundario */
  @Input() mensaje = 'Como invitado solo puedes ver. Inicia sesión para participar.';

  /** Texto del botón principal */
  @Input() textoBoton = 'Iniciar sesión';

  /** Se emite al hacer clic en el botón principal */
  @Output() irAlLogin = new EventEmitter<void>();

  /** Se emite al cerrar el aviso */
  @Output() cerrar = new EventEmitter<void>();

  onIrAlLogin(): void {
    this.irAlLogin.emit();
  }

  onCerrar(): void {
    this.cerrar.emit();
  }
}