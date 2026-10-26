// src/environments/environment.prod.ts
// Variables de entorno para PRODUCCIÓN (ng build).
export const environment = {
  production: true,
  // ⚠️ REEMPLAZA ESTA URL por la que te dio Render (termina en /api)
  apiUrl: 'https://kiert-backend.onrender.com/api', 
  
  // ⚠️ REEMPLAZA ESTA URL por la de Render pero con wss:// (sin /api al final)
  wsUrl: 'wss://kiert-backend.onrender.com', 
};
export * from './environment';