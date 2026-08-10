// reset-password.component.ts
import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

function contraseñasIgualesValidator(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('password')?.value;
  const confirmar = grupo.get('confirmarPassword')?.value;
  return password === confirmar ? null : { contraseñasDistintas: true };
}

@Component({
  selector: 'kiert-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  cargando = signal(false);
  exito = signal(false);
  errorMsg = signal<string | null>(null);
  token = signal<string>('');

  form = this.fb.group(
    {
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmarPassword: ['', [Validators.required]],
    },
    { validators: contraseñasIgualesValidator }
  );

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get password() { return this.form.controls.password; }
  get confirmarPassword() { return this.form.controls.confirmarPassword; }

  ngOnInit(): void {
    const tokenParam = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(tokenParam);
    
    if (!tokenParam) {
      this.errorMsg.set('El enlace no es válido o expiró.');
    }
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const tokenValue = this.token();
    if (!tokenValue) {
      this.errorMsg.set('El enlace no es válido o expiró.');
      return;
    }

    const password = this.form.getRawValue().password;
    const confirmar = this.form.getRawValue().confirmarPassword;
    if (password !== confirmar) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.restablecerContrasena(tokenValue, password!).subscribe({
      next: () => {
        this.exito.set(true);
        this.cargando.set(false);
        setTimeout(() => this.irAlLogin(), 3000);
      },
      error: (error) => {
        let mensaje = 'El enlace expiró o ya fue usado. Solicita uno nuevo.';
        if (error.status === 400) {
          mensaje = error.error?.mensaje || 'El enlace no es válido.';
        } else if (error.status === 404) {
          mensaje = 'Token no encontrado. Solicita un nuevo enlace.';
        } else if (error.error?.mensaje) {
          mensaje = error.error.mensaje;
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
}