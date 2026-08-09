# Kiert — Frontend (Angular 20 standalone)

Comunidad para compartir casos, archivos y ayudarse entre usuarios.
Este paquete es **solo el frontend**, maquetado con datos de ejemplo (mock),
listo para conectarse al backend de Spring Boot en el siguiente paso.

## 1. Requisitos
- Node.js 20 o superior
- npm 10 o superior

## 2. Instalar dependencias
```bash
npm install
```

## 3. Levantar en modo desarrollo
```bash
npm start
```
Abre http://localhost:4200

## 4. Compilar para producción (archivos estáticos optimizados)
```bash
npm run build
```
Los archivos finales quedan en `dist/kiert-frontend/browser`, listos para
subir a cualquier hosting estático (Nginx, Vercel, Netlify, S3, etc.).

## 5. Estructura de carpetas
```
src/app/
  core/            -> lógica transversal: modelos, servicios HTTP, guard, interceptor
  shared/          -> componentes reutilizables (navbar, footer, post-card)
  layouts/         -> "moldes" visuales (auth-layout, main-layout)
  features/
    auth/          -> login, registro, recuperar y restablecer contraseña
    community/     -> feed, detalle de publicación, crear publicación
    profile/       -> perfil de usuario (incluye subir foto)
    chat/          -> mensajería entre usuarios
```

## 6. Conectar con el backend (próximo paso)
1. Cambia `apiUrl` en `src/environments/environment.ts` por la URL real del backend Spring Boot.
2. En `post.service.ts` y `chat.service.ts`, reemplaza los métodos marcados con `// MOCK`
   por las llamadas HTTP reales que ya están comentadas justo encima de cada uno.
3. Los endpoints esperados por este frontend son:
   - `POST /api/auth/login`
   - `POST /api/auth/registro`
   - `POST /api/auth/recuperar-contrasena`
   - `POST /api/auth/restablecer-contrasena`
   - `GET/POST /api/publicaciones`
   - `GET/POST /api/publicaciones/:id/comentarios`
   - `POST /api/archivos/url-firmada` (Supabase Storage)
   - `GET /api/chat` (o WebSocket para tiempo real)

## 7. Notas de diseño
- SCSS con tokens centralizados en `src/styles/_variables.scss`.
- Mobile-first: todo el CSS parte del layout de celular y se amplía con `@media`.
- Menú hamburguesa propio (sin librerías), animaciones mínimas (solo transiciones cortas).
- Formularios con Reactive Forms + validaciones (incluye validador personalizado de "contraseñas iguales").
