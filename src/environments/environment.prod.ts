// src/environments/environment.prod.ts
// Variables de entorno para PRODUCCION (build de Vercel).
export const environment = {
  production: true,
  apiUrl: 'https://kiert-backend.onrender.com/api',
  // IMPORTANTE: SockJS requiere http(s), NO ws(s).
  // El upgrade interno a WebSocket lo hace SockJS solo.
  wsUrl: 'https://kiert-backend.onrender.com',
};