// src/app/features/auth/login/login.component.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgxTurnstileModule } from 'ngx-turnstile';
import { AuthService } from '../../../core/services/auth.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'kiert-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, NgxTurnstileModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private adminAuth = inject(AdminAuthService);
  private storage = inject(StorageService);
  private personalizacionStore = inject(PersonalizacionStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  mostrarBotonAdmin = signal(false);

  readonly turnstileSiteKey = environment.turnstileSiteKey;
  turnstileToken: string | null = null;

  private returnUrl = '/comunidad';

  private readonly RUTAS_PRIVADAS = [
    '/perfil',
    '/ajustes',
    '/mis-publicaciones',
    '/comunidad/nueva-publicacion',
    '/anuncios',
    '/notificaciones',
    '/chat',
    '/admin'
  ];

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnUrl = this.validarRutaInterna(url) ?? '/comunidad';
  }

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  onTurnstileResolved(token: string | null): void {
    this.turnstileToken = token;
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.turnstileToken) {
      this.errorMsg.set('Completa la verificación de seguridad antes de continuar.');
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);
    this.mostrarBotonAdmin.set(false);

    const body = {
      email: this.form.value.email!,
      password: this.form.value.password!,
      turnstileToken: this.turnstileToken,
    };

    this.auth.login(body as any).subscribe({
      next: () => {
        this.storage.quitarInvitado();
        this.cargando.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (err: HttpErrorResponse) => {
        // Extraer mensaje y código del backend
        const mensaje: string = err.error?.error || err.error?.mensaje || '';
        const codigo: string = err.error?.error || '';

        // -------------------------------------------------------------
        // 1) Turnstile falló (403 con código TURNSTILE_FAILED)
        // -------------------------------------------------------------
        if (codigo === 'TURNSTILE_FAILED') {
          this.errorMsg.set('Verificación de seguridad fallida. Recarga la página e inténtalo de nuevo.');
          this.cargando.set(false);
          return;
        }

        // -------------------------------------------------------------
        // 2) Cuenta de administrador
        //    SOLO si el backend lo dice explícitamente.
        //    Tu backend debería devolver un código tipo "ADMIN_ACCOUNT"
        //    o un mensaje que contenga "administrador".
        // -------------------------------------------------------------
        const esAdmin =
          codigo === 'ADMIN_ACCOUNT' ||
          mensaje.toLowerCase().includes('administrador') ||
          mensaje.toLowerCase().includes('admin');

        if (esAdmin) {
          this.errorMsg.set('Esta cuenta es de administrador. Usa el panel de administración.');
          this.mostrarBotonAdmin.set(true);
          this.cargando.set(false);
          return;
        }

        // -------------------------------------------------------------
        // 3) Error normal de login
        // -------------------------------------------------------------
        if (err.status === 401) {
          this.errorMsg.set(mensaje || 'Correo o contraseña incorrectos');
        } else if (err.status === 400) {
          this.errorMsg.set(mensaje || 'Datos inválidos');
        } else if (err.status === 429) {
          this.errorMsg.set('Demasiados intentos. Espera un momento.');
        } else {
          this.errorMsg.set(mensaje || 'No se pudo iniciar sesión');
        }

        this.cargando.set(false);
      },
    });
  }

  entrarComoInvitado(): void {
    this.auth.limpiarSesionPublica();
    this.personalizacionStore.resetear();
    this.storage.resetearPreferencias();
    this.storage.setInvitado();

    const esRutaPrivada = this.RUTAS_PRIVADAS.some(r =>
      this.returnUrl === r || this.returnUrl.startsWith(r + '/')
    );
    const destino = esRutaPrivada ? '/comunidad' : this.returnUrl;

    this.router.navigateByUrl(destino);
  }

  private validarRutaInterna(url: string | null): string | null {
    if (!url) return null;
    if (!url.startsWith('/')) return null;
    if (url.startsWith('//')) return null;
    if (url.includes('\\')) return null;
    return url;
  }
}