// upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UrlFirmadaResponse {
  urlSubida: string;
  urlPublica: string;
}

export interface CloudinaryResponse {
  secure_url: string;
  url: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  // ✅ REEMPLAZA CON TU CLOUD NAME REAL
  private readonly CLOUDINARY_CLOUD_NAME = 'fzivwglgcuyuqvmqzumt';  // ← TU CLOUD NAME
  private readonly CLOUDINARY_UPLOAD_PRESET = 'kiert-preset';

  constructor(private http: HttpClient) {}

  // ✅ Subir archivo a Cloudinary
  subirArchivoCloudinary(archivo: File): Observable<CloudinaryResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'kiert-files');
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData
    );
  }

  // ✅ Subir múltiples archivos
  subirMultiplesArchivos(archivos: File[]): Observable<CloudinaryResponse[]> {
    const observables = archivos.map(archivo => this.subirArchivoCloudinary(archivo));
    return new Observable<CloudinaryResponse[]>((observer) => {
      import('rxjs').then(rx => {
        rx.forkJoin(observables).subscribe({
          next: (resultados) => observer.next(resultados),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      });
    });
  }

  // ✅ Compatible con Supabase
  pedirUrlFirmada(nombreArchivo: string, tipoContenido: string): Observable<UrlFirmadaResponse> {
    return this.http.post<UrlFirmadaResponse>(`${environment.apiUrl}/archivos/url-firmada`, {
      nombreArchivo,
      tipoContenido,
    });
  }

  subirArchivo(urlSubida: string, archivo: File): Observable<any> {
    return this.http.put(urlSubida, archivo, {
      headers: { 'Content-Type': archivo.type },
    });
  }

  // ✅ Subir foto de perfil
  subirFotoPerfil(archivo: File): Observable<CloudinaryResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'kiert-perfiles');
    formData.append('transformation', 'w_200,h_200,c_fill');
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );
  }

  eliminarArchivoCloudinary(publicId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/archivos/${publicId}`);
  }
}