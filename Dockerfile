# ============================================
# ETAPA 1: BUILD (Angular 20 + Node 22)
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos primero (mejor caching de capas)
COPY package.json package-lock.json ./

# Instalación limpia y reproducible
RUN npm ci

# Copiar el resto del proyecto
COPY . .

# Angular 20 usa production por defaultConfiguration en angular.json
RUN npm run build

# ============================================
# ETAPA 2: RUNTIME (Nginx sirviendo la SPA)
# ============================================
FROM nginx:alpine AS runner

# Limpiar HTML por defecto de nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar SOLO la carpeta browser del output de Angular 20
COPY --from=builder /app/dist/kiert-frontend/browser /usr/share/nginx/html

# Config personalizada (SPA fallback + gzip + cache)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]