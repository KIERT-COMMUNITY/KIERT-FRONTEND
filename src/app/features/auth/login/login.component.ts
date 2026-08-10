// login.component.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  cargando = signal(false);
  errorMsg = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/comunidad']);
      },
      error: () => {
        this.errorMsg.set('Correo o contraseña incorrectos');
        this.cargando.set(false);
      },
    });
  }
}