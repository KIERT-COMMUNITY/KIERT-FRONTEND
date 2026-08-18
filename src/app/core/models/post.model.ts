// ============================================================
// MODELOS PARA POSTS, COMENTARIOS Y RESPUESTAS
// ============================================================

export interface Adjunto {
  id: number;
  tipo: 'archivo' | 'link' | 'imagen' | 'video' | 'gif';
  nombre: string;
  url: string;
  pesoKb?: number;
  duracionSegundos?: number;
  ancho?: number;
  alto?: number;
  formato?: string;
}

export interface Autor {
  id: number;
  nombreUsuario: string;
  email?: string;
  fotoPerfilUrl?: string | null;
}

export interface Reacciones {
  likes: number;
  loves: number;
  hahas?: number;
  wows?: number;
  sads?: number;
  angrys?: number;
}

export interface Post {
  id: number;
  autor: Autor;
  titulo: string;
  descripcion: string;
  categoria: 'caso-hacking' | 'ayuda' | 'historia' | 'otro';
  adjuntos: Adjunto[];
  totalComentarios: number;
  fechaCreacion: string;
}

// ============================================================
// COMENTARIOS Y RESPUESTAS
// ============================================================

export interface Respuesta {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  reacciones?: Reacciones;
  eliminado?: boolean;
}

export interface Comentario {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  reacciones?: Reacciones;
  respuestas?: Respuesta[];
  totalRespuestas?: number;
  // Propiedades de UI (no vienen del backend)
  mostrandoRespuestas?: boolean;
  mostrandoFormularioRespuesta?: boolean;
  cargandoRespuestas?: boolean;
}