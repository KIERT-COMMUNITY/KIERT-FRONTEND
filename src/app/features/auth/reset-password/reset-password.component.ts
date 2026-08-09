// reset-password.component.ts -> paso 2 de "olvidé mi contraseña".
// El usuario llega acá desde el link del correo: /restablecer-contrasena?token=XYZ
import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function contraseñasIgualesValidator(grupo: AbstractControl): ValidationErrors | null {
  return grupo.get('password')?.value === grupo.get('confirmarPassword')?.value
    ? null
    : { contraseñasDistintas: true };
}

@Component({
  selector: 'kiert-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  cargando = signal(false);
  exito = signal(false);
  errorMsg = signal<string | null>(null);
  token = '';

  form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*\d).+$/)]],
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
    // queryParamMap: lee "?token=..." de la URL que llegó por el correo
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  enviar(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      if (!this.token) this.errorMsg.set('El enlace no es válido o expiró.');
      return;
    }

    this.cargando.set(true);
    this.auth.restablecerContrasena(this.token, this.form.getRawValue().password!).subscribe({
      next: () => {
        this.exito.set(true);
        this.cargando.set(false);
        setTimeout(() => this.router.navigate(['/login']), 2000); // redirige solo tras mostrar el éxito
      },
      error: () => {
        this.errorMsg.set('El enlace expiró o ya fue usado. Solicita uno nuevo.');
        this.cargando.set(false);
      },
    });
  }
}
