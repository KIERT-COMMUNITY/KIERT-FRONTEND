// post.model.ts -> forma de una publicación de la comunidad y sus comentarios.
export interface Adjunto {
  id: number;
  tipo: 'archivo' | 'link'; // un adjunto puede ser un archivo subido o un enlace externo
  nombre: string;           // nombre visible, ej: "informe-incidente.pdf"
  url: string;              // URL pública (en Supabase Storage si es archivo)
  pesoKb?: number;          // solo aplica si tipo === 'archivo'
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

export interface Comentario {
  id: number;
  autor: {
    id: number;
    nombreUsuario: string;
    fotoPerfilUrl?: string;
  };
  contenido: string;
  fechaCreacion: string;
}
