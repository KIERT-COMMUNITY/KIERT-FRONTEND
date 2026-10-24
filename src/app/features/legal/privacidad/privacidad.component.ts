// src/app/features/legal/privacidad/privacidad.component.ts
import { Component } from '@angular/core';
import { LegalLayoutComponent } from '../../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'kiert-privacidad',
  standalone: true,
  imports: [LegalLayoutComponent],
  templateUrl: './privacidad.component.html',
})
export class PrivacidadComponent {
  titulo = 'Política de Privacidad';
  ultimaActualizacion = '24 de octubre de 2026';
}