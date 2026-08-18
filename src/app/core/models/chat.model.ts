// src/app/core/models/chat.model.ts
export interface Conversacion {
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  ultimoMensaje?: string;
  ultimaConexion?: string;
  noLeidos: number;
}

export interface MensajeArchivo {
  id?: number;
  nombre: string;
  url: string;
  tipo: string;
  pesoKb?: number;
  esSensible?: boolean;
}

export interface Mensaje {
  id: number;
  emisorId: number;
  contenido: string;
  fechaEnvio: string;
  propio: boolean;
  archivos?: MensajeArchivo[];  // ✅ AÑADIR ESTA PROPIEDAD
  tipoMensaje?: string;
}export interface MensajeArchivo {
  id?: number;
  nombre: string;
  url: string;          // ✅ URL REAL de Cloudinary
  tipo: string;
  pesoKb?: number;
  esSensible?: boolean;
}

export interface Mensaje {
  id: number;
  emisorId: number;
  contenido: string;
  fechaEnvio: string;
  propio: boolean;
  archivos?: MensajeArchivo[];
  tipoMensaje?: string;
}

export interface SolicitudContacto {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA';
  fechaSolicitud: string;
}

export interface UsuarioDisponible {
  id: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
}