// src/app/core/models/biblioteca.model.ts

export type CategoriaRecurso =
  | 'certificacion'
  | 'curso'
  | 'video'
  | 'articulo'
  | 'herramienta'
  | 'libro'
  | 'idiomas'
  | 'entretenimiento'
  | 'juego'
  | 'recurso'
  | 'otro';

export type NivelRecurso = 'principiante' | 'intermedio' | 'avanzado';

export interface RecursoBiblioteca {
  id: number;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: CategoriaRecurso | string; // string libre para categorías personalizadas
  subcategoria?: string;
  imagen?: string;
  autor?: string;
  plataforma?: string;
  duracion?: string;
  nivel?: NivelRecurso | string | '';
  destacado?: boolean;

  // Auditoría
  fechaAgregado: Date | string;
  fechaActualizacion?: Date | string;

  // Tags
  tags?: string[];

  // Autor del recurso (para recursos subidos por usuarios)
  esUsuario?: boolean;
  usuarioId?: number;
  usuarioNombre?: string;
}