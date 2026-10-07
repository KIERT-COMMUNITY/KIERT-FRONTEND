// src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
import {
  Component,
  inject,
  HostListener,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService } from '../../../core/services/confirm.service';
import { FocusTrap } from '../../utils/focus-trap';

@Component({
  selector: 'kiert-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent implements AfterViewInit, OnDestroy {
  confirm = inject(ConfirmService);

  @ViewChild('dialogRef') dialogRef?: ElementRef<HTMLElement>;
  private focusTrap?: FocusTrap;

  constructor() {
    effect(() => {
      const abierto = this.confirm.estado().abierto;
      if (abierto) {
        setTimeout(() => {
          if (this.dialogRef?.nativeElement) {
            this.focusTrap = new FocusTrap(this.dialogRef.nativeElement);
            this.focusTrap.activate();
          }
        }, 0);
      } else {
        this.focusTrap?.deactivate();
        this.focusTrap = undefined;
      }
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.focusTrap?.deactivate();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirm.estado().abierto) {
      this.confirm.cancelar();
    }
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    if (this.confirm.estado().abierto) {
      this.confirm.aceptar();
    }
  }

  aceptar(): void {
    this.confirm.aceptar();
  }

  cancelar(): void {
    this.confirm.cancelar();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-overlay')) {
      this.confirm.cancelar();
    }
  }
}