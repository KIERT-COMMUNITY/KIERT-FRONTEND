// register.component.ts
import { Component, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

function contrasenasIgualesValidator(grupo: AbstractControl): ValidationErrors | null {
  const pass = grupo.get('password')?.value;
  const confirm = grupo.get('confirmarPassword')?.value;
  return pass === confirm ? null : { contrasenasDistintas: true };
}

@Component({
  selector: 'kiert-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  paso = signal<'form' | 'verificar' | 'exito'>('form');
  emailRegistrado = signal<string>('');
  reenviando = signal(false);
  codigoReenviado = signal(false);

  form = this.fb.group(
    {
      nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: contrasenasIgualesValidator }
  );

  formCodigo = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  get nombreUsuario() { return this.form.controls.nombreUsuario; }
  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
  get confirmarPassword() { return this.form.controls.confirmarPassword; }
  get codigo() { return this.formCodigo.controls.codigo; }

  // ===== PASO 1: enviar registro =====
  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { nombreUsuario, email, password } = this.form.getRawValue();

    this.auth.registro({
      nombreUsuario: nombreUsuario!,
      email: email!,
      password: password!
    }).subscribe({
      next: () => {
        this.emailRegistrado.set(email!);
        this.paso.set('verificar');
        this.cargando.set(false);
      },
      error: (err) => {
        const mensaje = err.error?.error
          || (err.status === 409 ? 'Ese correo o usuario ya esta registrado.' : 'No se pudo crear la cuenta.');
        this.errorMsg.set(mensaje);
        this.cargando.set(false);
      },
    });
  }

  // ===== PASO 2: verificar codigo =====
  verificarCodigo(): void {
    if (this.formCodigo.invalid) {
      this.formCodigo.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.verificarCuenta(this.emailRegistrado(), this.codigo.value!).subscribe({
      next: () => {
        this.paso.set('exito');
        this.cargando.set(false);
        setTimeout(() => this.router.navigate(['/login']), 5000);
      },
      error: (err) => {
        this.errorMsg.set(err.error?.error || 'Codigo incorrecto o expirado');
        this.cargando.set(false);
      },
    });
  }

  // ===== Reenviar codigo =====
  reenviarCodigo(): void {
    this.reenviando.set(true);
    this.errorMsg.set(null);

    this.auth.reenviarCodigoVerificacion(this.emailRegistrado()).subscribe({
      next: () => {
        this.reenviando.set(false);
        this.codigoReenviado.set(true);
        setTimeout(() => this.codigoReenviado.set(false), 5000);
      },
      error: () => {
        this.reenviando.set(false);
        this.errorMsg.set('No se pudo reenviar el codigo');
      },
    });
  }

  volverAlFormulario(): void {
    this.paso.set('form');
    this.formCodigo.reset();
    this.errorMsg.set(null);
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }
}