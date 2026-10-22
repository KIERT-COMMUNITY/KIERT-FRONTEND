// src/app/core/services/storage.service.ts
import { Injectable } from '@angular/core';

/**
 * Wrapper de sessionStorage con migración automática desde localStorage.
 *
 * sessionStorage es POR PESTAÑA. Cada pestaña tiene su propia sesión.
 * localStorage es compartido entre pestañas (lo que causaba el bug).
 *
 * Al leer una clave:
 *   1. Intenta leer de sessionStorage.
 *   2. Si no existe, intenta leer de localStorage (sesión vieja).
 *   3. Si encuentra en localStorage, la migra a sessionStorage y la borra de localStorage.
 *   4. A partir de ahí, esa pestaña tiene su propia copia independiente.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {

  private readonly sessionPrefix = 'kiert_s_';

  // ============================================================
  // GET con migración automática
  // ============================================================
  getItem(key: string): string | null {
    try {
      // 1) sessionStorage tiene prioridad
      const fromSession = sessionStorage.getItem(this.sessionPrefix + key);
      if (fromSession !== null) {
        return fromSession;
      }

      // 2) Fallback: migrar desde localStorage si existe
      const fromLocal = localStorage.getItem(key);
      if (fromLocal !== null) {
        sessionStorage.setItem(this.sessionPrefix + key, fromLocal);
        localStorage.removeItem(key); // ✅ borrar de localStorage para que no se comparta
        return fromLocal;
      }

      return null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // SET
  // ============================================================
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(this.sessionPrefix + key, value);
    } catch {
      // Ignorar si sessionStorage está lleno o bloqueado
    }
  }

  // ============================================================
  // REMOVE
  // ============================================================
  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(this.sessionPrefix + key);
      // ✅ También borrar de localStorage por si quedó residual
      localStorage.removeItem(key);
    } catch {
      // Ignorar
    }
  }

  // ============================================================
  // CLEAR (limpia todas las claves de esta app en esta pestaña)
  // ============================================================
  clearSession(): void {
    try {
      // Solo borra claves con prefijo kiert_s_
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.sessionPrefix)) {
          keys.push(k);
        }
      }
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {
      // Ignorar
    }
  }

  // ============================================================
  // PARA PREFERENCIAS NO SENSIBLES (compartidas entre pestañas)
  // ============================================================
  getLocal(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  setLocal(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch {}
  }

  removeLocal(key: string): void {
    try { localStorage.removeItem(key); } catch {}
  }
}