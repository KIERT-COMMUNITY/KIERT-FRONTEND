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

/**
 * Coincide con `AutorResumenDTO` del backend:
 * { id, nombreUsuario, fotoPerfilUrl, marcoId }
 */
export interface Autor {
  id: number | null;            // null cuando el post es anónimo
  nombreUsuario: string;        // "Anonimo" cuando esAnonimo = true
  fotoPerfilUrl?: string | null;
  marcoId?: string;             // "none" por defecto
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
 * Estado local de las reacciones del usuario.
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

// ============================================================
// POST
// ============================================================
/**
 * Coincide 1:1 con `PostDTO.java` del backend:
 * {
 *   id, autor, titulo, descripcion, categoria, adjuntos,
 *   totalComentarios, fechaCreacion,
 *   esAnonimo, esSensible, motivoSensibilidad
 * }
 */
export interface Post {
  id: number;
  autor: Autor;
  titulo: string;
  descripcion: string;
  categoria: string;
  adjuntos: Adjunto[];
  totalComentarios: number;
  fechaCreacion: string;

  // ✅ NUEVOS: alineados con el backend
  esAnonimo: boolean;
  esSensible: boolean;
  motivoSensibilidad: string | null; // 'nsfw' | 'violencia' | 'spoiler' | 'sangre' | 'otro' | null

  // Opcionales de UI (los rellena el frontend, no el backend)
  reacciones?: Reacciones;
  userReactions?: UserReactions;
}

// ============================================================
// COMENTARIO
// ============================================================
export interface Comentario {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  urlImagen?: string | null;
  reacciones?: Reacciones;

  userReactions?: UserReactions;

  // UI state (no viene del backend, se inicializa en cargarComentarios)
  respuestas?: Respuesta[];
  totalRespuestas?: number;        // opcional: solo si el backend lo expone
  mostrandoRespuestas?: boolean;
  mostrandoFormularioRespuesta?: boolean;
  cargandoRespuestas?: boolean;
}

// ============================================================
// RESPUESTA
// ============================================================
export interface Respuesta {
  id: number;
  autor: Autor;
  contenido: string;
  fechaCreacion: string;
  urlImagen?: string | null;
  reacciones?: Reacciones;

  userReactions?: UserReactions;

  eliminado?: boolean;
}