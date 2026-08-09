// upload.service.ts -> encargado de subir archivos (fotos de perfil,
// adjuntos de publicaciones) directo a SUPABASE STORAGE desde el navegador.
//
// Flujo real recomendado (más seguro):
//  1) El navegador pide al backend Spring Boot una "URL firmada" (signed URL)
//     de subida para ese archivo (el backend valida tamaño/tipo antes de darla).
//  2) El navegador sube el archivo DIRECTO a esa URL de Supabase (rápido,
//     no satura al backend con el peso del archivo).
//  3) El navegador avisa al backend "ya subí este archivo" con la URL final,
//     y el backend la guarda asociada al post/usuario en MySQL.
//
// Por ahora dejamos el método listo con la firma que se va a usar.
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UrlFirmadaResponse {
  urlSubida: string;   // URL temporal donde se hace el PUT del archivo
  urlPublica: string;  // URL final para guardar en la base de datos y mostrar el archivo
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private http: HttpClient) {}

  // Paso 1: pedir la URL firmada al backend
  pedirUrlFirmada(nombreArchivo: string, tipoContenido: string): Observable<UrlFirmadaResponse> {
    return this.http.post<UrlFirmadaResponse>(`${environment.apiUrl}/archivos/url-firmada`, {
      nombreArchivo,
      tipoContenido,
    });
  }

  // Paso 2: subir el archivo directo al bucket de Supabase usando esa URL
  subirArchivo(urlSubida: string, archivo: File): Observable<any> {
    return this.http.put(urlSubida, archivo, {
      headers: { 'Content-Type': archivo.type },
    });
  }
}
