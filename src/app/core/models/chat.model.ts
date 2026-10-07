export type TipoArchivoChat =
  | 'imagen'
  | 'video'
  | 'audio'
  | 'nota_voz'
  | 'documento'
  | 'zip'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'texto'
  | 'comprimido';

export type ResourceTypeCloudinary = 'image' | 'video' | 'raw';

export interface Conversacion {
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl: string | null;
  marcoId?: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeFecha?: string | null;
  ultimaConexion?: string | null;
  noLeidos: number;
  online?: boolean;
}

export interface MensajeArchivo {
  id?: number | null;
  nombre: string;
  url: string;
  tipo: TipoArchivoChat | string;
  pesoKb?: number | null;
  esSensible?: boolean;
  publicId?: string | null;
  tipoMime?: string | null;
  formato?: string | null;
  resourceType?: ResourceTypeCloudinary | string | null;
  tamanoBytes?: number | null;
  duracionSegundos?: number | null;
  ancho?: number | null;
  alto?: number | null;
}

export interface Mensaje {
  id: number;
  emisorId: number;
  contenido: string | null;
  fechaEnvio: string;
  propio: boolean;
  leido?: boolean;
  archivos?: MensajeArchivo[] | null;
}

export interface SolicitudContacto {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl: string | null;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  fechaSolicitud: string;
}

export interface UsuarioDisponible {
  id: number;
  nombreUsuario: string;
  fotoPerfilUrl: string | null;
  esContacto?: boolean;
}

export interface SolicitudContactoDTO {
  id: number;
  emisorId: number;
  nombreUsuario: string;
  fotoPerfilUrl: string | null;
  estado: string;
  fechaSolicitud: string;
}
