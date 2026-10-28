// src/app/core/services/posts-ocultos.service.ts
import { Injectable, signal, computed } from '@angular/core';

interface EntradaOculto {
  id: number;
  motivo: 'sensible' | 'no-interesa' | 'otro';
  fecha: number;
}

@Injectable({ providedIn: 'root' })
export class PostsOcultosService {
  private readonly STORAGE_KEY = 'kiert_posts_ocultos';

  private ocultosSignal = signal<Map<number, EntradaOculto>>(this.cargarDeStorage());

  /** IDs ocultos (para checks rápidos) */
  readonly idsOcultos = computed(() => new Set(this.ocultosSignal().keys()));

  /** Lista completa con motivo y fecha */
  readonly lista = computed(() => Array.from(this.ocultosSignal().values()));

  /** Cantidad total */
  readonly total = computed(() => this.ocultosSignal().size);

  // ============================================================
  // CONSULTAS
  // ============================================================
  estaOculto(postId: number): boolean {
    return this.ocultosSignal().has(postId);
  }

  motivoDe(postId: number): EntradaOculto['motivo'] | null {
    return this.ocultosSignal().get(postId)?.motivo ?? null;
  }

  // ============================================================
  // ACCIONES
  // ============================================================
  ocultar(postId: number, motivo: EntradaOculto['motivo'] = 'no-interesa'): void {
    if (!postId || postId <= 0) return;

    const mapa = new Map(this.ocultosSignal());
    mapa.set(postId, { id: postId, motivo, fecha: Date.now() });
    this.ocultosSignal.set(mapa);
    this.guardarEnStorage(mapa);
  }

  mostrar(postId: number): void {
    const mapa = new Map(this.ocultosSignal());
    if (!mapa.has(postId)) return;

    mapa.delete(postId);
    this.ocultosSignal.set(mapa);
    this.guardarEnStorage(mapa);
  }

  mostrarTodos(): void {
    this.ocultosSignal.set(new Map());
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {}
  }

  // ============================================================
  // FILTRADO
  // ============================================================
  filtrar<T extends { id: number }>(posts: T[]): T[] {
    const ocultos = this.idsOcultos();
    if (ocultos.size === 0) return posts;
    return posts.filter(p => !ocultos.has(p.id));
  }

  // ============================================================
  // STORAGE
  // ============================================================
  private cargarDeStorage(): Map<number, EntradaOculto> {
    const mapa = new Map<number, EntradaOculto>();
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return mapa;

      const arr: EntradaOculto[] = JSON.parse(raw);
      if (!Array.isArray(arr)) return mapa;

      for (const item of arr) {
        if (item && typeof item.id === 'number' && item.id > 0) {
          mapa.set(item.id, {
            id: item.id,
            motivo: item.motivo ?? 'no-interesa',
            fecha: item.fecha ?? Date.now()
          });
        }
      }
    } catch {
      // storage corrupto → empezar limpio
    }
    return mapa;
  }

  private guardarEnStorage(mapa: Map<number, EntradaOculto>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(mapa.values())));
    } catch {
      // sin storage (modo incógnito estricto) → no pasa nada, se pierde al recargar
    }
  }
}