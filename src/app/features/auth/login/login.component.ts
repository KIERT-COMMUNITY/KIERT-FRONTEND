// login.component.ts -> formulario de inicio de sesión.
// Usa Reactive Forms (FormGroup) en vez de ngModel: da mejor control de
// validaciones y es el estándar recomendado para formularios "serios".
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  cargando = signal(false);       // controla el estado "enviando..." del botón
  errorMsg = signal<string | null>(null); // mensaje de error del backend (ej: credenciales inválidas)

  // FormBuilder.group crea el formulario con sus validaciones:
  // Validators.required = obligatorio, Validators.email = formato válido
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  // Getters cortos para leer el estado de cada campo directo desde el HTML
  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched(); // fuerza que se muestren los errores aunque no se haya tocado el campo
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => this.router.navigate(['/comunidad']), // login OK -> entra a la comunidad
      error: () => {
        this.errorMsg.set('Correo o contraseña incorrectos.');
        this.cargando.set(false);
      },
    });
  }
}
