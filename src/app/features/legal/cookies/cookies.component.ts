// src/app/features/legal/cookies/cookies.component.ts
import { Component } from '@angular/core';
import { LegalLayoutComponent } from '../../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'kiert-cookies',
  standalone: true,
  imports: [LegalLayoutComponent],
  templateUrl: './cookies.component.html',
})
export class CookiesComponent {
  titulo = 'Política de Cookies';
  ultimaActualizacion = '24 de octubre de 2026';
}