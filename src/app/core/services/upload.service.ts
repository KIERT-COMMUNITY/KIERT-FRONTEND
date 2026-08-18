// src/app/core/services/upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  private readonly CLOUDINARY_CLOUD_NAME = 'zopnporu';
  private readonly CLOUDINARY_UPLOAD_PRESET = 'kiert-preset';

  constructor(private http: HttpClient) {}

  // ✅ SUBIR ARCHIVO A CLOUDINARY DESDE EL FRONTEND
  subirArchivoCloudinary(archivo: File): Observable<CloudinaryResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'chat'); // ✅ Carpeta "chat" en Cloudinary
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData
    );
  }

  // ✅ SUBIR MÚLTIPLES ARCHIVOS
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
}