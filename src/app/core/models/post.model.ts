// post.model.ts
export interface Adjunto {
  id: number;
  tipo: 'archivo' | 'link';
  nombre: string;
  url: string;
  pesoKb?: number;
}

export interface Post {
  id: number;
  autor: {
    id: number;
    nombreUsuario: string;
    fotoPerfilUrl?: string;
  };
  titulo: string;
  descripcion: string;
  categoria: 'caso-hacking' | 'ayuda' | 'historia' | 'otro';
  adjuntos: Adjunto[];
  totalComentarios: number;
  fechaCreacion: string;
}
// post.model.ts - ACTUALIZADO
export interface Comentario {
  id: number;
  autor: {
    id: number;
    nombreUsuario: string;
    fotoPerfilUrl?: string;
  };
  contenido: string;
  fechaCreacion: string;
  reacciones?: {
    likes: number;
    loves: number;
  };
}