// Punto de entrada de la aplicación (equivalente al "main" de otros lenguajes).
// bootstrapApplication arranca Angular en modo standalone: sin NgModules,
// el AppComponent se monta directo junto con su configuración (appConfig).
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err)); // si algo falla al iniciar, se ve en consola
