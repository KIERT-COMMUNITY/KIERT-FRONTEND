// src/app/core/services/storage.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {

  private readonly sessionPrefix = 'kiert_s_';
  private readonly INVITADO_KEY = 'kiert_modo_invitado';

  // ============================================================
  // GET con migración automática
  // ============================================================
  getItem(key: string): string | null {
    try {
      const fromSession = sessionStorage.getItem(this.sessionPrefix + key);
      if (fromSession !== null) return fromSession;

      const fromLocal = localStorage.getItem(key);
      if (fromLocal !== null) {
        sessionStorage.setItem(this.sessionPrefix + key, fromLocal);
        localStorage.removeItem(key);
        return fromLocal;
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // SET / REMOVE
  // ============================================================
  setItem(key: string, value: string): void {
    try {
      sessionStorage.setItem(this.sessionPrefix + key, value);
    } catch {}
  }

  removeItem(key: string): void {
    try {
      sessionStorage.removeItem(this.sessionPrefix + key);
      localStorage.removeItem(key);
    } catch {}
  }

  // ============================================================
  // CLEAR
  // ============================================================
  clearSession(): void {
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(this.sessionPrefix)) keys.push(k);
      }
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {}
  }

  // ============================================================
  // LOCAL STORAGE (preferencias no sensibles)
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

  // ============================================================
  // ✅ MODO INVITADO
  // ============================================================
  setInvitado(): void {
    this.setLocal(this.INVITADO_KEY, 'true');
  }

  esInvitado(): boolean {
    return this.getLocal(this.INVITADO_KEY) === 'true';
  }

  quitarInvitado(): void {
    this.removeLocal(this.INVITADO_KEY);
  }
}