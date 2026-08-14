// user.model.ts
export interface User {
  id: number;
  nombreUsuario: string;
  email: string;
  fotoPerfilUrl?: string | null;
  bio?: string;
  fechaRegistro?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  nombreUsuario: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  usuario: User;
}