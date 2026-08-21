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
  marcoId?: string;
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
  categoria: string;  // ✅ String libre
  adjuntos: Adjunto[];
  totalComentarios: number;
  fechaCreacion: string;
}

export interface Comentario {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  reacciones?: Reacciones;
  respuestas?: Respuesta[];
  totalRespuestas?: number;
  mostrandoRespuestas?: boolean;
  mostrandoFormularioRespuesta?: boolean;
  cargandoRespuestas?: boolean;
}

export interface Respuesta {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  reacciones?: Reacciones;
  eliminado?: boolean;
}