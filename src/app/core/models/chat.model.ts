// chat.model.ts -> forma de una conversación y un mensaje de chat.
export interface Conversacion {
  usuarioId: number;
  nombreUsuario: string;
  fotoPerfilUrl?: string;
  ultimoMensaje: string;
  ultimaConexion?: string;
  noLeidos: number;
}

export interface Mensaje {
  id: number;
  emisorId: number;
  contenido: string;
  fechaEnvio: string;
  propio: boolean; // true si el mensaje lo envió el usuario logueado (para alinearlo a la derecha)
}
