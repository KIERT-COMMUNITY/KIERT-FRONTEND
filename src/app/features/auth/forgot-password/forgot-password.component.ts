// forgot-password.component.ts
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  cargando = signal(false);
  enviado = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  get email() { return this.form.controls.email; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);

    this.auth.solicitarRecuperacion(this.form.getRawValue().email!).subscribe({
      next: () => { 
        this.enviado.set(true); 
        this.cargando.set(false); 
      },
      error: () => { 
        this.enviado.set(true); 
        this.cargando.set(false); 
      },
    });
  }
}