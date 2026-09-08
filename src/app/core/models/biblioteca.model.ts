// src/app/core/models/biblioteca.model.ts
export interface RecursoBiblioteca {
  id: number;
  titulo: string;
  descripcion: string;
  url: string;
  categoria: 'certificacion' | 'curso' | 'video' | 'articulo' | 'herramienta' | 'libro';
  subcategoria?: string;
  imagen?: string;
  autor?: string;
  plataforma?: string;
  duracion?: string;
  nivel?: 'principiante' | 'intermedio' | 'avanzado';
  destacado?: boolean;
  fechaAgregado: Date;
  tags?: string[];
}