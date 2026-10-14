// src/app/core/services/sticker.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Sticker } from '../models/sticker.model';

@Injectable({ providedIn: 'root' })
export class StickerService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/stickers`;

  misStickers = signal<Sticker[]>([]);
  stickersPublicos = signal<Sticker[]>([]);
  cargado = signal<boolean>(false);

  // ============================================================
  // LISTAR
  // ============================================================
  listarMisStickers(): Observable<Sticker[]> {
    return this.http.get<Sticker[]>(`${this.baseUrl}/mis-stickers`).pipe(
      tap(data => {
        this.misStickers.set(data || []);
        this.cargado.set(true);
      })
    );
  }

  listarStickersPublicos(): Observable<Sticker[]> {
    return this.http.get<Sticker[]>(`${this.baseUrl}/publicos`).pipe(
      tap(data => this.stickersPublicos.set(data || []))
    );
  }

  // ============================================================
  // CREAR (agrega a mis stickers y recarga públicos)
  // ============================================================
  crearSticker(nombre: string, esPublico: boolean, archivo: File): Observable<Sticker> {
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('esPublico', String(esPublico));
    formData.append('archivo', archivo);

    return this.http.post<Sticker>(this.baseUrl, formData).pipe(
      tap(nuevo => {
        // Agregar a mis stickers
        this.misStickers.update(lista => [nuevo, ...lista]);

        // Si es público, agregarlo también a públicos
        if (nuevo.esPublico) {
          this.stickersPublicos.update(lista => [nuevo, ...lista]);
        }
      }),
      // Recargar públicos desde el backend para sincronizar
      switchMap(nuevo =>
        this.listarStickersPublicos().pipe(
          switchMap(() => [nuevo])
        )
      )
    );
  }

  // ============================================================
  // ELIMINAR (quita de ambas listas locales)
  // ============================================================
  eliminarSticker(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.misStickers.update(lista => lista.filter(s => s.id !== id));
        this.stickersPublicos.update(lista => lista.filter(s => s.id !== id));
      })
    );
  }

  // ============================================================
  // ASEGURAR CARGADOS
  // ============================================================
  asegurarCargados(): void {
    if (!this.cargado()) {
      this.listarMisStickers().subscribe({ error: () => {} });
    }
  }
}