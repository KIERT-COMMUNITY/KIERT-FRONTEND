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
  mimeType?: string;            // ← NUEVO: ej. "video/mp4"
  miniaturaUrl?: string;        // ← NUEVO: poster/thumbnail del video
  subtitulos?: Subtitulo[];     // ← NUEVO: subtítulos disponibles
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
  categoria: string;
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