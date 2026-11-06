// src/app/shared/directives/pull-to-refresh.directive.ts
import { Directive, ElementRef, HostListener, inject, output, signal } from '@angular/core';

@Directive({
  selector: '[appPullToRefresh]',
  standalone: true
})
export class PullToRefreshDirective {
  private el = inject(ElementRef);

  onRefresh = output<void>();

  pullDistance = signal(0);
  pullOpacity = signal(0);
  isRefreshing = signal(false);

  private startY = 0;
  private isPulling = false;
  private readonly maxPull = 100;
  private readonly threshold = 60;

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    // Detectamos si estamos cerca del tope de la página
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    
    // Si el scroll está en 0 o cerca, permitimos jalar
    if (scrollTop <= 5 && !this.isRefreshing()) {
      this.startY = event.touches[0].clientY;
      this.isPulling = true;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isPulling || this.isRefreshing()) return;

    const currentY = event.touches[0].clientY;
    const diff = currentY - this.startY;

    // Solo si arrastramos hacia abajo
    if (diff > 0) {
      if (event.cancelable) {
        event.preventDefault();
      }
      const distance = Math.min(diff * 0.5, this.maxPull);
      this.pullDistance.set(distance);
      this.pullOpacity.set(Math.min(distance / this.threshold, 1));
    }
  }

  @HostListener('touchend')
  onTouchEnd() {
    if (!this.isPulling || this.isRefreshing()) return;
    this.isPulling = false;

    if (this.pullDistance() >= this.threshold) {
      this.isRefreshing.set(true);
      this.pullDistance.set(this.threshold);
      this.pullOpacity.set(1);

      // Forzamos 1 segundo de espera para que se vea el spinner
      setTimeout(() => {
        this.onRefresh.emit();
        this.finishRefresh();
      }, 1000);
    } else {
      this.reset();
    }
  }

  finishRefresh() {
    this.isRefreshing.set(false);
    this.reset();
  }

  private reset() {
    this.pullDistance.set(0);
    this.pullOpacity.set(0);
  }
}