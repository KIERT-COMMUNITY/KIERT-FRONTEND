// src/app/features/auth/forgot-password/forgot-password.component.ts
import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'kiert-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements OnDestroy {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  paso = signal<'email' | 'codigo' | 'password' | 'exito'>('email');
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  emailEnviado = signal<string>('');
  codigoVerificado = signal<string>('');

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  // Paso 1: email
  formEmail = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // Paso 2: codigo
  formCodigo = this.fb.group({
    codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  // Paso 3: nueva contrasena
  formPassword = this.fb.group({
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
    ]],
    confirmarPassword: ['', [Validators.required]],
  });

  get email() { return this.formEmail.controls.email; }
  get codigo() { return this.formCodigo.controls.codigo; }
  get password() { return this.formPassword.controls.password; }
  get confirmarPassword() { return this.formPassword.controls.confirmarPassword; }

  // ===== PASO 1: enviar email =====
  solicitarCodigo(): void {
    if (this.formEmail.invalid) {
      this.formEmail.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const email = this.email.value!;
    this.auth.solicitarRecuperacion(email).subscribe({
      next: () => {
        this.emailEnviado.set(email);
        this.paso.set('codigo');
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.error?.error || 'No se pudo enviar el codigo. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  // ===== PASO 2: verificar codigo contra el servidor =====
  verificarCodigo(): void {
    if (this.formCodigo.invalid) {
      this.formCodigo.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const codigoIngresado = this.codigo.value!;

    this.auth.verificarCodigoRecuperacion(this.emailEnviado(), codigoIngresado).subscribe({
      next: () => {
        this.codigoVerificado.set(codigoIngresado);
        this.paso.set('password');
        this.cargando.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.error?.error || 'Codigo incorrecto o expirado');
        this.cargando.set(false);
      },
    });
  }

  // ===== PASO 3: cambiar contrasena =====
  cambiarPassword(): void {
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }

    if (this.password.value !== this.confirmarPassword.value) {
      this.errorMsg.set('Las contrasenas no coinciden');
      return;
    }

    // Seguridad: no permitir el reset si el codigo no fue verificado por el servidor
    if (!this.codigoVerificado()) {
      this.errorMsg.set('Debes verificar el codigo antes de cambiar la contrasena');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.resetPasswordConCodigo(
      this.emailEnviado(),
      this.codigoVerificado(),
      this.password.value!
    ).subscribe({
      next: () => {
        this.paso.set('exito');
        this.cargando.set(false);
        this.redirectTimer = setTimeout(() => this.router.navigate(['/login']), 5000);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMsg.set(err.error?.error || 'Codigo incorrecto o expirado');
        this.cargando.set(false);
      },
    });
  }

  volverAlEmail(): void {
    this.paso.set('email');
    this.formCodigo.reset();
    this.formPassword.reset();
    this.codigoVerificado.set('');
    this.errorMsg.set(null);
  }

  volverAlCodigo(): void {
    this.paso.set('codigo');
    this.formPassword.reset();
    this.codigoVerificado.set('');
    this.errorMsg.set(null);
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }
}