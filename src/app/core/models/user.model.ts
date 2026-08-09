// user.model.ts -> "forma" (interface) que va a tener un usuario en el frontend.
// Definir interfaces nos da autocompletado y evita errores de tipeo en toda la app.
export interface User {
  id: number;
  nombreUsuario: string;   // nombre público, ej: "@neo"
  email: string;
  fotoPerfilUrl?: string;  // URL del archivo guardado en Supabase Storage
  bio?: string;
  fechaRegistro?: string;
}

// Lo que se envía al hacer login
export interface LoginRequest {
  email: string;
  password: string;
}

// Lo que se envía al registrarse
export interface RegisterRequest {
  nombreUsuario: string;
  email: string;
  password: string;
}

// Lo que responde el backend tras login/registro exitoso
export interface AuthResponse {
  token: string;       // JWT
  usuario: User;
}
