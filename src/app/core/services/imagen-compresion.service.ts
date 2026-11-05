// src/app/core/services/imagen-compresion.service.ts
import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';

@Injectable({ providedIn: 'root' })
export class ImagenCompresionService {

  /**
   * Comprime imagenes generales (posts, anuncios, etc.)
   * Maximo 500 KB, 1200px, WebP.
   */
  async comprimir(file: File): Promise<File> {
    const opciones = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.8,
    };

    try {
      const comprimida = await imageCompression(file, opciones);
      console.log(`Imagen original: ${(file.size / 1024).toFixed(0)} KB -> Comprimida: ${(comprimida.size / 1024).toFixed(0)} KB`);
      return comprimida;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return file;
    }
  }

  /**
   * Comprime avatares de perfil.
   * Maximo 100 KB, 400px, WebP.
   */
  async comprimirAvatar(file: File): Promise<File> {
    const opciones = {
      maxSizeMB: 0.1,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.85,
    };

    try {
      const comprimida = await imageCompression(file, opciones);
      console.log(`Avatar original: ${(file.size / 1024).toFixed(0)} KB -> Comprimido: ${(comprimida.size / 1024).toFixed(0)} KB`);
      return comprimida;
    } catch (error) {
      console.error('Error comprimiendo avatar:', error);
      return file;
    }
  }
}