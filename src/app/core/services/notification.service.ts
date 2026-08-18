// src/app/core/services/notification.service.ts
import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  public mensajesNoLeidos: WritableSignal<number> = signal<number>(0);

  actualizarContador(valor: number): void {
    console.log('📢 NotificationService: Actualizando contador a:', valor);
    this.mensajesNoLeidos.set(valor);
  }

  resetearContador(): void {
    console.log('📢 NotificationService: 🗑️ RESETEANDO contador a 0');
    this.mensajesNoLeidos.set(0);
  }

  incrementarContador(): void {
    this.mensajesNoLeidos.update(valor => {
      const nuevo = valor + 1;
      console.log('📢 NotificationService: Incrementando contador a:', nuevo);
      return nuevo;
    });
  }
}