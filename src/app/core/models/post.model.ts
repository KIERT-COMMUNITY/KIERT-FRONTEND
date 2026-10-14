// src/app/core/models/post.model.ts

// ============================================================
// MODELOS PARA POSTS, COMENTARIOS Y RESPUESTAS
// ============================================================

export interface Subtitulo {
  id: number;
  idioma: string;            // 'es', 'en', 'pt', etc.
  etiqueta: string;          // 'Español', 'English', 'Português'
  url: string;               // URL del archivo .vtt
  porDefecto?: boolean;      // si se activa por defecto
  esAutoGenerado?: boolean;  // si fue generado automáticamente
  fechaCreacion?: string;
}

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
  mimeType?: string;            // ej. "video/mp4"
  miniaturaUrl?: string;        // poster/thumbnail del video
  subtitulos?: Subtitulo[];     // subtítulos disponibles
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

/**
 * ✅ NUEVO: Estado local de las reacciones del usuario.
 * Se usa en el frontend para saber si el usuario ya reaccionó
 * (a un post, comentario o respuesta).
 */
export interface UserReactions {
  like: boolean;
  love: boolean;
  haha?: boolean;
  wow?: boolean;
  sad?: boolean;
  angry?: boolean;
}

export interface Post {
  id: number;
  autor: Autor;
  titulo: string;
  descripcion: string;
  categoria: string;
  adjuntos: Adjunto[];
  totalComentarios: number;
  fechaCreacion: string;

  // ✅ NUEVO: reacciones del post
  reacciones?: Reacciones;

  // ✅ NUEVO: estado de reacciones del usuario actual
  userReactions?: UserReactions;
}

export interface Comentario {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  reacciones?: Reacciones;

  // ✅ NUEVO: estado de reacciones del usuario actual
  userReactions?: UserReactions;

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

  // ✅ NUEVO: estado de reacciones del usuario actual
  userReactions?: UserReactions;

  eliminado?: boolean;
}