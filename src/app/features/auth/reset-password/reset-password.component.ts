// src/app/features/auth/reset-password/reset-password.component.ts
import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

function contrasenasIgualesValidator(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('password')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  return password === confirmar ? null : { contrasenasDistintas: true };
}

@Component({
  selector: 'kiert-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cargando = signal(false);
  exito = signal(false);
  errorMsg = signal<string | null>(null);
  token = signal<string>('');

  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  form = this.fb.group(
    {
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: contrasenasIgualesValidator }
  );

  get password() { return this.form.controls.password; }
  get confirmarPassword() { return this.form.controls.confirmarPassword; }

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token') ?? '';
    // SEGURIDAD: validar formato del token antes de usarlo
    if (!this.tokenConFormatoValido(tokenParam)) {
      this.token.set('');
      this.errorMsg.set('El enlace no es valido o expiro.');
      return;
    }
    this.token.set(tokenParam);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tokenValue = this.token();
    if (!tokenValue) {
      this.errorMsg.set('El enlace no es valido o expiro.');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.restablecerContrasena(tokenValue, this.password.value!).subscribe({
      next: () => {
        this.exito.set(true);
        this.cargando.set(false);
        this.redirectTimer = setTimeout(() => this.irAlLogin(), 3000);
      },
      error: (err: HttpErrorResponse) => {
        let mensaje = 'El enlace expiro o ya fue usado. Solicita uno nuevo.';
        if (err.status === 400) {
          mensaje = err.error?.error || err.error?.mensaje || 'El enlace no es valido.';
        } else if (err.status === 404) {
          mensaje = 'Token no encontrado. Solicita un nuevo enlace.';
        } else if (err.error?.error) {
          mensaje = err.error.error;
        } else if (err.error?.mensaje) {
          mensaje = err.error.mensaje;
        }
        this.errorMsg.set(mensaje);
        this.cargando.set(false);
      },
    });
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }

  solicitarNuevoEnlace(): void {
    this.router.navigate(['/recuperar-contrasena']);
  }

  irAlLoginAhora(): void {
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

  /**
   * SEGURIDAD: valida que el token tenga un formato aceptable.
   * Ajusta la regex si tu backend usa otro esquema (por ejemplo, JWT con puntos).
   * Este ejemplo acepta tokens alfanumericos de 32 a 128 caracteres con - y _.
   */
  private tokenConFormatoValido(token: string): boolean {
    if (!token) return false;
    if (token.length < 32 || token.length > 128) return false;
    return /^[A-Za-z0-9_-]+$/.test(token);
  }
}