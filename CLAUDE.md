# KIERT-FRONTEND

Aplicación Angular 20 para la comunidad KIERT: compartir casos, archivos y comunicación entre usuarios.

## Comandos

```bash
# Desarrollo
npm start              # Servidor de desarrollo en http://localhost:4200
ng serve               # Alternativa directa

# Build
npm run build          # Build de producción → dist/kiert-frontend/browser
npm run build -- --configuration=development   # Build de desarrollo

# Tests (Vitest)
npm test -- --no-watch # Ejecutar tests una sola vez (CI/local)
npm test               # Modo watch (solo desarrollo)

# Docker
docker build -t kiert-frontend .                    # Construir imagen
docker run -d -p 4200:80 kiert-frontend             # Ejecutar contenedor local