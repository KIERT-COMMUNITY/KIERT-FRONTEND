// src/app/shared/utils/focus-trap.ts
export class FocusTrap {
  private focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  private element: HTMLElement;
  private previousFocus: HTMLElement | null;
  private keydownHandler: (e: KeyboardEvent) => void;

  constructor(element: HTMLElement) {
    this.element = element;
    this.previousFocus = document.activeElement as HTMLElement;
    this.keydownHandler = this.onKeyDown.bind(this);
  }

  activate(): void {
    this.element.setAttribute('tabindex', '-1');
    this.element.focus();
    document.addEventListener('keydown', this.keydownHandler, true);
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.keydownHandler, true);
    this.previousFocus?.focus?.();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      this.element.querySelectorAll<HTMLElement>(this.focusableSelector)
    ).filter(el => el.offsetParent !== null);

    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}