// src/app/features/legal/legal-layout/legal-layout.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'kiert-legal-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './legal-layout.component.html',
  styleUrl: './legal-layout.component.scss',
})
export class LegalLayoutComponent {
  @Input() titulo = '';
  @Input() ultimaActualizacion = '';
  anioActual = new Date().getFullYear();
}