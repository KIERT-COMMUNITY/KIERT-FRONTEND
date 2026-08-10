// chat.model.ts
export interface Conversacion {
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  ultimoMensaje?: string;
  ultimaConexion?: string;
  noLeidos: number;
}

export interface Mensaje {
  id: number;
  emisorId: number;
  contenido: string;
  fechaEnvio: string;
  propio: boolean;
}

export interface SolicitudContacto {
  id: number;
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  estado: 'pendiente' | 'aceptada' | 'rechazada';
  fechaSolicitud: string;
}

export interface UsuarioDisponible {
  id: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
}