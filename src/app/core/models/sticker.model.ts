// src/app/core/models/sticker.model.ts
export interface Sticker {
  id: number;
  usuarioId: number;
  nombre: string;
  urlImagen: string;
  urlMiniatura?: string | null;
  tipoArchivo?: string | null;
  pesoKb?: number | null;
  ancho?: number | null;
  alto?: number | null;
  esPublico: boolean;
  fechaCreacion: string;
}