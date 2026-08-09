// post-card.component.ts -> tarjeta que representa UNA publicación resumida.
// Se usa dentro del feed (lista) recibiendo el post como @Input().
// Es "tonto" a propósito: no pide datos, solo MUESTRA lo que le pasan (fácil de reutilizar).
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../../core/models/post.model';

@Component({
  selector: 'kiert-post-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './post-card.component.html',
  styleUrl: './post-card.component.scss',
})
export class PostCardComponent {
  // input(): forma moderna (Angular 17+) de declarar un @Input(), como signal
  post = input.required<Post>();

  // Diccionario para mostrar una etiqueta legible según la categoría
  etiquetas: Record<Post['categoria'], string> = {
    'caso-hacking': 'Caso de hacking',
    ayuda: 'Pide ayuda',
    historia: 'Historia',
    otro: 'Otro',
  };
}
