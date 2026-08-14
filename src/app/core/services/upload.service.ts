// upload.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
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
  // CONFIGURACIÓN DE CLOUDINARY
  private readonly CLOUDINARY_CLOUD_NAME = 'zopnporu'; // TU CLOUD NAME
  private readonly CLOUDINARY_UPLOAD_PRESET = 'kiert-preset';

  constructor(private http: HttpClient) {}

  // ========== SUBIR A CLOUDINARY ==========
  subirArchivoCloudinary(archivo: File): Observable<CloudinaryResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'kiert-perfiles');
    
    // Transformación para foto de perfil
    formData.append('transformation', JSON.stringify([
      { width: 200, height: 200, crop: 'fill' }
    ]));
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/image/upload`,
      formData
    );
  }

  // ========== SUBIR MÚLTIPLES ARCHIVOS ==========
  subirMultiplesArchivos(archivos: File[]): Observable<CloudinaryResponse[]> {
    const observables = archivos.map(archivo => this.subirArchivoCloudinary(archivo));
    return forkJoin(observables);
  }

  // ========== SUBIR ARCHIVO PARA POSTS ==========
  subirArchivoPost(archivo: File): Observable<CloudinaryResponse> {
    const formData = new FormData();
    formData.append('file', archivo);
    formData.append('upload_preset', this.CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'kiert-posts');
    
    return this.http.post<CloudinaryResponse>(
      `https://api.cloudinary.com/v1_1/${this.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData
    );
  }

  // ========== SUPABASE (URL FIRMADA) ==========
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

  // ========== ELIMINAR ==========
  eliminarArchivoCloudinary(publicId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/archivos/${publicId}`);
  }
}