// src/app/features/legal/terminos/terminos.component.ts
import { Component } from '@angular/core';
import { LegalLayoutComponent } from '../../../layouts/legal-layout/legal-layout.component';

@Component({
  selector: 'kiert-terminos',
  standalone: true,
  imports: [LegalLayoutComponent],
  templateUrl: './terminos.component.html',
})
export class TerminosComponent {
  titulo = 'Términos de Uso';
  ultimaActualizacion = '24 de octubre de 2026';
}