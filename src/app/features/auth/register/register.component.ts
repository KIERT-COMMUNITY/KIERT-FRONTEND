// register.component.ts -> formulario de registro de un nuevo usuario.
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

// Validador personalizado: compara "password" y "confirmarPassword".
// En Angular, un validador de grupo recibe el FormGroup completo (no un solo control).
function contraseñasIgualesValidator(grupo: AbstractControl): ValidationErrors | null {
  const pass = grupo.get('password')?.value;
  const confirm = grupo.get('confirmarPassword')?.value;
  return pass === confirm ? null : { contraseñasDistintas: true };
}

@Component({
  selector: 'kiert-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  cargando = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group(
    {
      nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      // pattern exige al menos: 1 mayúscula, 1 número y 8 caracteres -> contraseña "segura"
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: contraseñasIgualesValidator } // validador a nivel de todo el grupo
  );

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  get nombreUsuario() { return this.form.controls.nombreUsuario; }
  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get confirmarPassword() { return this.form.controls.confirmarPassword; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { nombreUsuario, email, password } = this.form.getRawValue();
    this.auth.registro({ nombreUsuario: nombreUsuario!, email: email!, password: password! }).subscribe({
      next: () => this.router.navigate(['/comunidad']),
      error: (err) => {
        // 409 = correo o usuario ya existe (código sugerido para el backend)
        this.errorMsg.set(err.status === 409 ? 'Ese correo o usuario ya está registrado.' : 'No se pudo crear la cuenta.');
        this.cargando.set(false);
      },
    });
  }
}
