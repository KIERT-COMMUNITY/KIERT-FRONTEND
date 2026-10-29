// src/app/shared/utils/url-sanitizer.ts

/**
 * Devuelve una URL segura para usar en <img src>, <a href>, etc.
 * Bloquea javascript:, vbscript:, file:, blob: y data: que no sean imágenes.
 */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = String(url).trim();
  const lower = trimmed.toLowerCase();

  // data: solo si es imagen
  if (lower.startsWith('data:')) {
    return /^data:image\/(png|jpe?g|gif|webp|svg\+xml|bmp);base64,/i.test(trimmed)
      ? trimmed
      : null;
  }

  // esquemas peligrosos
  if (/^(javascript|vbscript|file|blob):/i.test(lower)) return null;

  // rutas relativas
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }

  // http(s) absolutas
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return null;
}

/**
 * Valida que una URL sea http(s) antes de window.open.
 */
export function isSafeExternalUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(String(url).trim());
}

/**
 * Abre una URL externa de forma segura (evita reverse tabnabbing).
 */
export function openExternalSafe(url: string | null | undefined): void {
  if (!isSafeExternalUrl(url)) {
    console.warn('[security] URL bloqueada por no ser http(s):', url);
    return;
  }
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (win) win.opener = null;
}

/**
 * Normaliza un identificador a solo [a-z0-9-] para usar en clases CSS.
 */
export function safeClassToken(value: string | null | undefined, fallback = 'default'): string {
  if (!value) return fallback;
  const cleaned = String(value).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return cleaned || fallback;
}

/**
 * Devuelve un valor seguro para style.background-image.
 * Acepta solo http(s) y rutas relativas. Devuelve 'none' si no es seguro.
 */
export function safeBackgroundImage(url: string | null | undefined): string {
  const safe = safeUrl(url);
  if (!safe) return 'none';
  // Escapa comillas, parentesis y backslash para no romper la declaracion CSS.
  const escaped = safe.replace(/["'()\\]/g, '');
  return `url("${escaped}")`;
}

/**
 * Valida que un string sea un gradiente CSS o un color solido legitimo.
 */
export function safeCssGradient(value: string | null | undefined): string {
  const fallback = 'linear-gradient(135deg, #0d1117, #161b22)';
  if (!value) return fallback;

  const trimmed = String(value).trim();

  // Rechaza cualquier cosa peligrosa
  if (/javascript:|vbscript:|expression\s*\(|url\s*\(|@import|<\/|<!--/i.test(trimmed)) {
    return fallback;
  }

  // Solo permite gradientes o colores
  const gradienteValido = /^(linear|radial|conic)-gradient\s*\([^;{}]*\)$/i.test(trimmed);
  const colorValido = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z]+)$/i.test(trimmed);

  return gradienteValido || colorValido ? trimmed : fallback;
}

/**
 * Normaliza un id de marco a un token seguro.
 */
export function safeFrameToken(value: string | null | undefined, fallback = 'none'): string {
  if (!value) return fallback;
  const cleaned = String(value).toLowerCase().replace(/[^a-z0-9-]/g, '');
  return cleaned || fallback;
}