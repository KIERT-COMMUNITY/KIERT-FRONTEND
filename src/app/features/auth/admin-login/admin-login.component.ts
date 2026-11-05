// src/app/features/admin/admin-login/admin-login.component.ts
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgxTurnstileModule } from 'ngx-turnstile';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'kiert-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxTurnstileModule],
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

  // VARIABLES DE CLOUDFLARE TURNSTILE
  readonly turnstileSiteKey = environment.turnstileSiteKey;
  turnstileToken: string | null = null;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  togglePassword(): void {
    this.mostrarPassword.update(v => !v);
  }

  // MÉTODO PARA RECIBIR EL TOKEN DE CLOUDFLARE
  onTurnstileResolved(token: string | null): void {
    this.turnstileToken = token;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    //  VALIDACIÓN DE CLOUDFLARE
    if (!this.turnstileToken) {
      this.errorMsg.set('Completa la verificación de seguridad antes de continuar.');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.form.getRawValue();

    //  CORREGIDO: Se pasa el turnstileToken como tercer parámetro al servicio
    this.adminAuth.login(email!, password!, this.turnstileToken).subscribe({
      next: () => {
        this.cargando.set(false);
        const redirect = this.route.snapshot.queryParams['redirect'] || '/admin/reportes';
        const rutaSegura = this.validarRutaInterna(redirect);
        this.router.navigate([rutaSegura]);
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

  private validarRutaInterna(ruta: string): string {
    if (!ruta.startsWith('/')) return '/admin/reportes';
    if (ruta.startsWith('//')) return '/admin/reportes';
    return ruta;
  }
}