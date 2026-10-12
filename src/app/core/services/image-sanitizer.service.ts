// src/app/core/services/image-sanitizer.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ImageSanitizerService {

  /**
   * ✅ Limpia TODOS los metadatos EXIF de una imagen redibujándola en canvas.
   *    Elimina GPS, cámara, fecha original, dispositivo, etc.
   */
  async limpiarMetadatos(
    archivo: File,
    opciones: {
      maxAncho?: number;
      maxAlto?: number;
      calidad?: number;
      formatoSalida?: 'image/jpeg' | 'image/png' | 'image/webp';
    } = {}
  ): Promise<File> {

    const {
      maxAncho = 2000,
      maxAlto = 2000,
      calidad = 0.9,
      formatoSalida = 'image/jpeg'
    } = opciones;

    if (!archivo.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen');
    }

    // ⚠️ GIF animados: no procesar (perdería la animación)
    if (archivo.type === 'image/gif') {
      return archivo;
    }

    // ⚠️ SVG: no procesar (canvas no maneja SVG complejos)
    if (archivo.type === 'image/svg+xml') {
      return archivo;
    }

    const dataUrlOriginal = await this.leerComoDataUrl(archivo);
    const img = await this.cargarImagen(dataUrlOriginal);

    const { ancho, alto } = this.calcularDimensiones(
      img.width, img.height, maxAncho, maxAlto
    );

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');

    // Suavizado de alta calidad
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fondo blanco para JPEG (transparencia → blanco)
    if (formatoSalida === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, ancho, alto);
    }

    // ✅ Redibujar la imagen elimina TODOS los metadatos EXIF
    ctx.drawImage(img, 0, 0, ancho, alto);

    const blob = await this.canvasToBlob(canvas, formatoSalida, calidad);

    const nombreBase = archivo.name.replace(/\.[^.]+$/, '');
    const extension = formatoSalida.split('/')[1];
    const nuevoNombre = `${nombreBase}.${extension}`;

    return new File([blob], nuevoNombre, {
      type: formatoSalida,
      lastModified: Date.now()
    });
  }

  /**
   * ✅ Variante específica para fotos de perfil:
   *    - Recorta a cuadrado (centrado)
   *    - Limpia metadatos
   *    - Reduce a 400x400
   */
  async limpiarFotoPerfil(archivo: File): Promise<File> {
    if (!archivo.type.startsWith('image/')) {
      throw new Error('El archivo no es una imagen');
    }

    if (archivo.type === 'image/gif' || archivo.type === 'image/svg+xml') {
      return archivo;
    }

    const dataUrlOriginal = await this.leerComoDataUrl(archivo);
    const img = await this.cargarImagen(dataUrlOriginal);

    const lado = Math.min(img.width, img.height);
    const offsetX = (img.width - lado) / 2;
    const offsetY = (img.height - lado) / 2;

    const TAMANO = 400;

    const canvas = document.createElement('canvas');
    canvas.width = TAMANO;
    canvas.height = TAMANO;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, TAMANO, TAMANO);

    ctx.drawImage(
      img,
      offsetX, offsetY, lado, lado,
      0, 0, TAMANO, TAMANO
    );

    const blob = await this.canvasToBlob(canvas, 'image/jpeg', 0.92);
    const nombreBase = archivo.name.replace(/\.[^.]+$/, '');

    return new File([blob], `${nombreBase}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  }

  /**
   * ✅ Procesa MÚLTIPLES archivos de una vez (útil para crear posts).
   *    Los no-imagen se devuelven sin cambios.
   */
  async limpiarArchivos(archivos: File[]): Promise<File[]> {
    const resultado: File[] = [];

    for (const archivo of archivos) {
      if (archivo.type.startsWith('image/')) {
        try {
          const limpio = await this.limpiarMetadatos(archivo, {
            maxAncho: 2000,
            maxAlto: 2000,
            calidad: 0.9,
            formatoSalida: 'image/jpeg'
          });
          resultado.push(limpio);
        } catch (error) {
          console.error(`Error al limpiar ${archivo.name}:`, error);
          resultado.push(archivo); // fallback: usar original
        }
      } else {
        resultado.push(archivo);
      }
    }

    return resultado;
  }

  // ============================================================
  // HELPERS
  // ============================================================
  private leerComoDataUrl(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(archivo);
    });
  }

  private cargarImagen(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = dataUrl;
    });
  }

  private calcularDimensiones(
    anchoOriginal: number,
    altoOriginal: number,
    maxAncho: number,
    maxAlto: number
  ): { ancho: number; alto: number } {
    let ancho = anchoOriginal;
    let alto = altoOriginal;

    if (ancho > maxAncho) {
      alto = Math.round((alto * maxAncho) / ancho);
      ancho = maxAncho;
    }

    if (alto > maxAlto) {
      ancho = Math.round((ancho * maxAlto) / alto);
      alto = maxAlto;
    }

    return { ancho, alto };
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    formato: string,
    calidad: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al convertir canvas a Blob'));
        },
        formato,
        calidad
      );
    });
  }
}