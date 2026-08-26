// src/app/core/models/chat.model.ts

export interface Conversacion {
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeFecha?: string | null;
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
  leido?: boolean;
  archivos?: MensajeArchivo[];
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