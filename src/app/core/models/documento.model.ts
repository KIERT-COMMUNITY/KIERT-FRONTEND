// src/app/core/models/documento.model.ts
export interface Documento {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  categoriaPersonalizada?: string;
  urlArchivo: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoKb: number;
  autor: AutorResumen;
  descargas: number;
  visitas: number;
  fechaCreacion: Date;
}

export interface AutorResumen {
  id: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  marcoId?: string;
}

export interface CrearDocumentoDTO {
  titulo: string;
  descripcion: string;
  categoria?: string;
  categoriaPersonalizada?: string;
}