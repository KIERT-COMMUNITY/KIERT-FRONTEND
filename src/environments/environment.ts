// Variables de entorno para DESARROLLO (ng serve).
// apiUrl: donde vive el backend Spring Boot. Se cambia acá cuando conectemos el back.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  // URL pública del bucket de Supabase donde se sirven los archivos subidos
  supabaseUrl: 'LINK SUPABASE.ICO',
  supabaseBucket: 'kiert-files',
};
