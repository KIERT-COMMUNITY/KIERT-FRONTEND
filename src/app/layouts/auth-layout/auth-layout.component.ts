// auth-layout.component.ts -> molde visual SOLO para login/registro/recuperar.
// Es una tarjeta centrada, sin navbar (el usuario todavía no tiene sesión).
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'kiert-auth-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent {}
