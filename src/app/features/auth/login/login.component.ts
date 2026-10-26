// src/app/features/auth/login/login.component.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AdminAuthService } from '../../../core/services/admin-auth.service';
import { StorageService } from '../../../core/services/storage.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'kiert-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private adminAuth = inject(AdminAuthService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  mostrarBotonAdmin = signal(false);

  private returnUrl = '/comunidad';

  // ✅ Rutas que el invitado NO puede usar (fallback → /comunidad)
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
    if (url) this.returnUrl = url;
  }

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorMsg.set(null);
    this.mostrarBotonAdmin.set(false);

    this.auth.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => {
        this.storage.quitarInvitado();
        this.cargando.set(false);
        this.router.navigateByUrl(this.returnUrl || '/comunidad');
      },
      error: (err) => {
        const mensaje = err.error?.error || err.error?.mensaje || '';
        const esAdmin = mensaje.toLowerCase().includes('administrador') ||
                        mensaje.toLowerCase().includes('admin') ||
                        err.status === 403;

        if (esAdmin) {
          this.errorMsg.set('Esta cuenta es de administrador. Usa el panel de administración.');
          this.mostrarBotonAdmin.set(true);
        } else {
          this.errorMsg.set(
            mensaje || (err.status === 401 ? 'Correo o contraseña incorrectos' : 'No se pudo iniciar sesión')
          );
        }
        this.cargando.set(false);
      },
    });
  }

  /** ✅ Entrar como invitado */
  entrarComoInvitado(): void {
    this.auth.limpiarSesionPublica();
    this.storage.setInvitado();

    // ✅ Si el returnUrl es una ruta privada, mandamos al invitado a /comunidad
    const esRutaPrivada = this.RUTAS_PRIVADAS.some(r => this.returnUrl.startsWith(r));
    const destino = esRutaPrivada ? '/comunidad' : (this.returnUrl || '/comunidad');

    this.router.navigateByUrl(destino);
  }
}