// app.config.ts -> reemplaza al viejo "AppModule". Es donde se registran
// todos los "providers" globales de la aplicación standalone (sin NgModules).
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Optimiza la detección de cambios agrupando eventos (mejor performance)
    provideZoneChangeDetection({ eventCoalescing: true }),

    // Registra todas las rutas definidas en app.routes.ts
    // withComponentInputBinding permite recibir los parámetros de la URL
    // directamente como @Input() en el componente (ej: :id de un post)
    provideRouter(routes, withComponentInputBinding()),

    // Habilita HttpClient para llamar al backend, con el interceptor
    // que agrega el token JWT automáticamente a cada petición
    provideHttpClient(withInterceptors([authInterceptor])),

    // Animaciones (las usamos MUY poco, solo transiciones sutiles)
    provideAnimations(),
  ],
};
