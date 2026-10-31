// src/app/core/services/modal.service.ts
import { Injectable, signal } from '@angular/core';

export interface InvitarLinkModalState {
  grupoId: number;
  grupoNombre: string;
}

export interface GrupoInfoModalState {
  grupoId: number;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  readonly invitarLink = signal<InvitarLinkModalState | null>(null);
  readonly grupoInfo = signal<GrupoInfoModalState | null>(null);

  abrirInvitarLink(grupoId: number, grupoNombre: string): void {
    this.invitarLink.set({ grupoId, grupoNombre });
  }
  cerrarInvitarLink(): void {
    this.invitarLink.set(null);
  }

  abrirGrupoInfo(grupoId: number): void {
    this.grupoInfo.set({ grupoId });
  }
  cerrarGrupoInfo(): void {
    this.grupoInfo.set(null);
  }

  cerrarTodos(): void {
    this.invitarLink.set(null);
    this.grupoInfo.set(null);
  }
}