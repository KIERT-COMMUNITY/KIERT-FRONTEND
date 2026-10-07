// src/app/core/services/keyboard-shortcuts.service.ts
import { Injectable, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { PersonalizacionStore } from './personalizacion-store.service';
import { AuthService } from './auth.service';

export interface AtajoTeclado {
  tecla: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  descripcion: string;
  categoria: 'Navegación' | 'Acciones' | 'Apariencia' | 'Sistema';
  accion: () => void;
}

@Injectable({ providedIn: 'root' })
export class KeyboardShortcutsService {
  private router = inject(Router);
  private personalizacionStore = inject(PersonalizacionStore);
  private authService = inject(AuthService);

  atajosActivos = signal<boolean>(this.cargarEstadoAtajos());
  mostrarAyuda = signal<boolean>(false);

  constructor() {
    document.addEventListener('keydown', this.onKeyDown);
    effect(() => {
      // Guardar estado cada vez que cambia
      try {
        localStorage.setItem('kiert_atajos_activos', String(this.atajosActivos()));
      } catch {}
    });
  }

  // ============================================================
  // LISTA DE ATAJOS DISPONIBLES
  // ============================================================
  get atajosDisponibles(): AtajoTeclado[] {
    return [
      // ===== NAVEGACIÓN =====
      { tecla: 'g', descripcion: 'Ir al feed de comunidad', categoria: 'Navegación',
        accion: () => this.router.navigate(['/comunidad']) },
      { tecla: 'p', descripcion: 'Ir a mi perfil', categoria: 'Navegación',
        accion: () => this.router.navigate(['/perfil']) },
      { tecla: 'm', descripcion: 'Ir a mis publicaciones', categoria: 'Navegación',
        accion: () => this.router.navigate(['/mis-publicaciones']) },
      { tecla: 'c', descripcion: 'Ir al chat', categoria: 'Navegación',
        accion: () => this.router.navigate(['/chat']) },
      { tecla: 'b', descripcion: 'Ir a la biblioteca', categoria: 'Navegación',
        accion: () => this.router.navigate(['/biblioteca']) },
      { tecla: 'a', descripcion: 'Ir a ajustes', categoria: 'Navegación',
        accion: () => this.router.navigate(['/settings']) },
      { tecla: 'n', descripcion: 'Ir a notificaciones', categoria: 'Navegación',
        accion: () => this.router.navigate(['/notificaciones']) },

      // ===== ACCIONES =====
      { tecla: 'Escape', descripcion: 'Cerrar modal / dropdown', categoria: 'Acciones',
        accion: () => this.cerrarTodo() },
      { tecla: '/', descripcion: 'Enfocar buscador', categoria: 'Acciones',
        accion: () => this.focusBuscador() },
      { tecla: '?', shift: true, descripcion: 'Ver ayuda de atajos', categoria: 'Acciones',
        accion: () => this.mostrarAyuda.update(v => !v) },

      // ===== APARIENCIA =====
      { tecla: '+', ctrl: true, descripcion: 'Aumentar tamaño de texto', categoria: 'Apariencia',
        accion: () => this.personalizacionStore.ajustarEscala(0.05) },
      { tecla: '=', ctrl: true, descripcion: 'Aumentar tamaño de texto', categoria: 'Apariencia',
        accion: () => this.personalizacionStore.ajustarEscala(0.05) },
      { tecla: '-', ctrl: true, descripcion: 'Reducir tamaño de texto', categoria: 'Apariencia',
        accion: () => this.personalizacionStore.ajustarEscala(-0.05) },
      { tecla: '0', ctrl: true, descripcion: 'Restablecer tamaño de texto', categoria: 'Apariencia',
        accion: () => this.personalizacionStore.resetearEscala() },
      { tecla: 'T', alt: true, descripcion: 'Rotar tema de color', categoria: 'Apariencia',
        accion: () => this.rotarTema() },
      { tecla: 'D', alt: true, descripcion: 'Modo día/noche', categoria: 'Apariencia',
        accion: () => this.toggleModoDiaNoche() },

      // ===== SISTEMA =====
      { tecla: 'F', alt: true, descripcion: 'Foco al contenido principal', categoria: 'Sistema',
        accion: () => this.focusContenidoPrincipal() },
      { tecla: 'Q', alt: true, descripcion: 'Cerrar sesión', categoria: 'Sistema',
        accion: () => this.cerrarSesion() },
    ];
  }

  // ============================================================
  // MANEJO DE ATAJOS
  // ============================================================
  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    const escribiendo = this.estaEscribiendo(target);

    // ===== ESC funciona SIEMPRE =====
    if (event.key === 'Escape') {
      if (this.atajosActivos()) {
        this.cerrarTodo();
      }
      return;
    }

    // ===== ? (Shift + /) =====
    if (event.key === '?' && !escribiendo) {
      if (this.atajosActivos()) {
        event.preventDefault();
        this.mostrarAyuda.update(v => !v);
      }
      return;
    }

    // ===== Ctrl + / Ctrl - / Ctrl 0 =====
    if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '0'].includes(event.key)) {
      if (this.atajosActivos()) {
        event.preventDefault();
        if (event.key === '+' || event.key === '=') {
          this.personalizacionStore.ajustarEscala(0.05);
        } else if (event.key === '-') {
          this.personalizacionStore.ajustarEscala(-0.05);
        } else if (event.key === '0') {
          this.personalizacionStore.resetearEscala();
        }
      }
      return;
    }

    // Si está escribiendo, no interceptar
    if (escribiendo) return;
    if (!this.atajosActivos()) return;

    // ===== Buscar atajo coincidente =====
    const atajo = this.atajosDisponibles.find(a => {
      const teclaMatch = a.tecla.toLowerCase() === event.key.toLowerCase();
      if (!teclaMatch) return false;
      return (
        !!a.ctrl === event.ctrlKey &&
        !!a.shift === event.shiftKey &&
        !!a.alt === event.altKey &&
        !!a.meta === event.metaKey
      );
    });

    if (atajo) {
      event.preventDefault();
      atajo.accion();
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  private estaEscribiendo(elemento: HTMLElement | null): boolean {
    if (!elemento) return false;
    const tag = elemento.tagName?.toLowerCase();
    const esEditable = elemento.isContentEditable;
    const tipoInput = (elemento as HTMLInputElement).type;
    const esInputTexto = tag === 'input' &&
      !['checkbox', 'radio', 'button', 'submit', 'range'].includes(tipoInput);

    return tag === 'textarea' || tag === 'select' || esInputTexto || esEditable;
  }

  private cerrarTodo(): void {
    this.mostrarAyuda.set(false);
    // Cerrar modales abiertos
    const overlays = document.querySelectorAll<HTMLElement>(
      '.modal-overlay, .dropdown-notificaciones, .dropdown-categoria, .dropdown-menu'
    );
    if (overlays.length > 0) {
      overlays[0]?.click?.();
    }
  }

  private focusBuscador(): void {
    const buscador = document.querySelector<HTMLInputElement>(
      'input[type="search"], .search-input, [data-search-input]'
    );
    if (buscador) {
      buscador.focus();
      buscador.select();
    } else {
      this.router.navigate(['/biblioteca']);
      setTimeout(() => {
        document.querySelector<HTMLInputElement>('.search-input')?.focus();
      }, 300);
    }
  }

  private focusContenidoPrincipal(): void {
    const main = document.querySelector<HTMLElement>(
      'main, [role="main"], .main-content'
    );
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private rotarTema(): void {
    const temas = this.personalizacionStore.colorThemes().map(t => t.id);
    const actual = this.personalizacionStore.temaId();
    const idx = temas.indexOf(actual);
    const siguiente = temas[(idx + 1) % temas.length];

    this.personalizacionStore.guardarPersonalizacion(
      siguiente,
      this.personalizacionStore.marcoId(),
      this.personalizacionStore.fondoId()
    );

    this.mostrarToast(`Tema: ${siguiente}`);
  }

  private toggleModoDiaNoche(): void {
    const actual = this.personalizacionStore.temaId();
    const nuevo = actual === 'light' ? 'default' : 'light';

    this.personalizacionStore.guardarPersonalizacion(
      nuevo,
      this.personalizacionStore.marcoId(),
      this.personalizacionStore.fondoId()
    );

    this.mostrarToast(`Modo: ${nuevo === 'light' ? 'día' : 'noche'}`);
  }

  private cerrarSesion(): void {
    if (confirm('¿Cerrar sesión?')) {
      this.authService.logout?.();
      this.router.navigate(['/login']);
    }
  }

  // ============================================================
  // TOAST TEMPORAL
  // ============================================================
  private mostrarToast(mensaje: string): void {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    toast.style.cssText = `
      position: fixed;
      bottom: 96px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #2dd4bf, #17b6a4);
      color: #0d1117;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 14px;
      z-index: 99999;
      box-shadow: 0 8px 32px rgba(45, 212, 191, 0.4);
      animation: kbd-slideUp 0.3s ease;
      pointer-events: none;
      font-family: 'JetBrains Mono', monospace;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'kbd-slideDown 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  // ============================================================
  // ACTIVAR / DESACTIVAR
  // ============================================================
  toggleAtajos(): void {
    this.atajosActivos.update(v => !v);
  }

  private cargarEstadoAtajos(): boolean {
    try {
      const guardado = localStorage.getItem('kiert_atajos_activos');
      if (guardado !== null) return guardado === 'true';
    } catch {}
    return true;
  }
}