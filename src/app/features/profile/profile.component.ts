// profile.component.ts -> pantalla de perfil del usuario logueado.
// Muestra sus datos y permite cambiar la foto de perfil (se sube a Supabase).
import { Component, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'kiert-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  subiendoFoto = signal(false);
  previsualizacion = signal<string | null>(null); // vista previa local antes de subir

  constructor(public auth: AuthService, private uploadService: UploadService) {}

  onFotoSeleccionada(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    if (!archivo) return;

    // FileReader: muestra la imagen elegida al instante, sin esperar la subida real
    const lector = new FileReader();
    lector.onload = () => this.previsualizacion.set(lector.result as string);
    lector.readAsDataURL(archivo);

    this.subiendoFoto.set(true);

    // Flujo real: 1) pedir URL firmada al backend, 2) subir el archivo a Supabase
    this.uploadService.pedirUrlFirmada(archivo.name, archivo.type).subscribe({
      next: (res) => {
        this.uploadService.subirArchivo(res.urlSubida, archivo).subscribe({
          next: () => this.subiendoFoto.set(false),
          error: () => this.subiendoFoto.set(false),
        });
      },
      error: () => this.subiendoFoto.set(false),
    });
  }
}
