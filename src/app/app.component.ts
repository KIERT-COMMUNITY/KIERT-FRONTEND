// app.component.ts -> componente RAÍZ. Es muy pequeño a propósito:
// solo contiene el <router-outlet>, que es donde Angular va "inyectando"
// el componente que corresponda según la URL actual (definida en app.routes.ts).
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'kiert-root',      // así se llama <kiert-root></kiert-root> en index.html
  standalone: true,             // componente standalone: no necesita estar en un NgModule
  imports: [RouterOutlet],      // importa SOLO lo que este componente usa en su HTML
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
