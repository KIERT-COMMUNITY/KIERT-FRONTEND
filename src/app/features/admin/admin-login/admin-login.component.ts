// src/app/features/admin/admin-login/admin-login.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminAuthService } from '../../../core/services/admin-auth.service';

@Component({
  selector: 'kiert-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss'
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private adminAuth = inject(AdminAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  mostrarPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  togglePassword(): void {
    this.mostrarPassword.update(v => !v);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.getRawValue();

    this.adminAuth.login(email!, password!).subscribe({
      next: () => {
        this.cargando.set(false);
        const redirect = this.route.snapshot.queryParams['redirect'] || '/admin/reportes';
        this.router.navigate([redirect]);
      },
      error: (err) => {
        const mensaje =
          err.error?.error ||
          err.error?.mensaje ||
          (err.status === 401
            ? 'Credenciales incorrectas'
            : 'No se pudo iniciar sesión');
        this.errorMsg.set(mensaje);
        this.cargando.set(false);
      }
    });
  }
}