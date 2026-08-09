// forgot-password.component.ts -> pantalla "olvidé mi contraseña".
// Paso 1 del flujo: el usuario ingresa su correo y el backend le envía
// un link con un token temporal (ese link abre reset-password con ?token=...).
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  cargando = signal(false);
  enviado = signal(false); // true cuando el backend ya confirmó el envío del correo

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  get email() { return this.form.controls.email; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);

    this.auth.solicitarRecuperacion(this.form.getRawValue().email!).subscribe({
      // Por seguridad, se muestra el mismo mensaje exista o no ese correo
      // (así nadie puede "adivinar" qué correos están registrados)
      next: () => { this.enviado.set(true); this.cargando.set(false); },
      error: () => { this.enviado.set(true); this.cargando.set(false); },
    });
  }
}
