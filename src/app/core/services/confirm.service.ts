// src/app/core/services/confirm.service.ts
import { Injectable, signal } from '@angular/core';

export type ConfirmTipo = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOpciones {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: ConfirmTipo;
  icono?: 'trash' | 'alert' | 'info' | 'check' | 'logout' | 'block';
  detalle?: string;
}

export interface ConfirmEstado extends ConfirmOpciones {
  abierto: boolean;
  resolve?: (valor: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly estado = signal<ConfirmEstado>({
    abierto: false,
    titulo: '',
    mensaje: '',
    tipo: 'warning',
    icono: 'alert'
  });

  confirmar(opciones: ConfirmOpciones): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.estado.set({
        ...opciones,
        tipo: opciones.tipo || 'warning',
        icono: opciones.icono || 'alert',
        textoConfirmar: opciones.textoConfirmar || 'Confirmar',
        textoCancelar: opciones.textoCancelar || 'Cancelar',
        abierto: true,
        resolve
      });
    });
  }

  eliminar(mensaje: string, titulo = '¿Eliminar?'): Promise<boolean> {
    return this.confirmar({
      titulo,
      mensaje,
      tipo: 'danger',
      icono: 'trash',
      textoConfirmar: 'Eliminar',
      textoCancelar: 'Cancelar',
      detalle: 'Esta acción no se puede deshacer.'
    });
  }

  cerrarSesion(): Promise<boolean> {
    return this.confirmar({
      titulo: '¿Cerrar sesión?',
      mensaje: 'Tendrás que volver a iniciar sesión para acceder a tu cuenta.',
      tipo: 'warning',
      icono: 'logout',
      textoConfirmar: 'Cerrar sesión',
      textoCancelar: 'Quedarme'
    });
  }

  aceptar(): void {
    const { resolve } = this.estado();
    resolve?.(true);
    this.estado.update(e => ({ ...e, abierto: false, resolve: undefined }));
  }

  cancelar(): void {
    const { resolve } = this.estado();
    resolve?.(false);
    this.estado.update(e => ({ ...e, abierto: false, resolve: undefined }));
  }
}