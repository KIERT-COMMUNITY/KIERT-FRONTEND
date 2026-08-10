// src/polyfills.ts
/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * Los polyfills principales están en index.html para cargar antes que todo.
 */

import 'zone.js';

// ✅ Polyfills adicionales por si fallan los del index.html
if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: { DEBUG: undefined },
    version: '',
    nextTick: (cb: any) => setTimeout(cb, 0),
    browser: true
  };
}

if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: (data: any) => typeof data === 'string' ? data.split('').map((c: string) => c.charCodeAt(0)) : data,
    isBuffer: () => false,
    alloc: (size: number) => new Array(size).fill(0)
  };
}

console.log('✅ Polyfills de Angular cargados');