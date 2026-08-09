// post.service.ts -> toda la lógica para hablar con el backend sobre publicaciones.
// HOY (fase frontend) devuelve datos de EJEMPLO con `of(...)` para poder
// maquetar la interfaz sin depender del backend todavía.
// Cuando conectemos Spring Boot, se descomentan las líneas con `this.http...`
// y se borran los métodos "mock" (quedan marcados con MOCK: para ubicarlos rápido).
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Post, Comentario } from '../models/post.model';

@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly baseUrl = `${environment.apiUrl}/publicaciones`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Post[]> {
    // return this.http.get<Post[]>(this.baseUrl); // <- versión real (backend)
    return of(this.mockPosts()); // MOCK: datos de ejemplo
  }

  obtenerPorId(id: number): Observable<Post | undefined> {
    // return this.http.get<Post>(`${this.baseUrl}/${id}`); // <- versión real
    return of(this.mockPosts().find((p) => p.id === id)); // MOCK
  }

  crear(formData: FormData): Observable<Post> {
    // FormData porque el post puede llevar archivos adjuntos (multipart/form-data)
    return this.http.post<Post>(this.baseUrl, formData);
  }

  listarComentarios(postId: number): Observable<Comentario[]> {
    // return this.http.get<Comentario[]>(`${this.baseUrl}/${postId}/comentarios`);
    return of(this.mockComentarios()); // MOCK
  }

  comentar(postId: number, contenido: string): Observable<Comentario> {
    return this.http.post<Comentario>(`${this.baseUrl}/${postId}/comentarios`, { contenido });
  }

  // ---- MOCK: se elimina cuando el backend esté conectado ----
  private mockPosts(): Post[] {
    return [
      {
        id: 1,
        autor: { id: 2, nombreUsuario: 'root_ana' },
        titulo: 'Detecté un phishing dirigido a mi empresa',
        descripcion:
          'Recibí un correo que suplantaba a mi banco pidiendo actualizar datos. Comparto los headers y cómo lo identifiqué, por si a alguien más le llega algo similar.',
        categoria: 'caso-hacking',
        adjuntos: [
          { id: 1, tipo: 'archivo', nombre: 'headers-correo.txt', url: '#', pesoKb: 12 },
          { id: 2, tipo: 'link', nombre: 'Análisis en VirusTotal', url: 'https://virustotal.com' },
        ],
        totalComentarios: 4,
        fechaCreacion: '2026-08-06T14:30:00Z',
      },
      {
        id: 2,
        autor: { id: 3, nombreUsuario: 'kai_dev' },
        titulo: 'Perdí acceso a mi cuenta de correo, ¿cómo recupero todo?',
        descripcion:
          'Me cambiaron la contraseña sin avisarme. Ya reporté al proveedor pero no sé qué más hacer mientras espero respuesta.',
        categoria: 'ayuda',
        adjuntos: [],
        totalComentarios: 9,
        fechaCreacion: '2026-08-07T09:10:00Z',
      },
      {
        id: 3,
        autor: { id: 4, nombreUsuario: 'lu.sec' },
        titulo: 'Cómo salí de una extorsión por webcam (mi historia)',
        descripcion:
          'Hace un año pasé por esto y no sabía a quién acudir. Cuento paso a paso qué hice y a dónde denuncié, espero le sirva a alguien.',
        categoria: 'historia',
        adjuntos: [{ id: 3, tipo: 'link', nombre: 'Guía de la fiscalía', url: 'https://gob.pe' }],
        totalComentarios: 15,
        fechaCreacion: '2026-08-08T20:00:00Z',
      },
    ];
  }

  private mockComentarios(): Comentario[] {
    return [
      {
        id: 1,
        autor: { id: 5, nombreUsuario: 'pipe_ctf' },
        contenido: 'Te recomiendo también reportarlo a PhishTank, ayuda a que se bloquee más rápido.',
        fechaCreacion: '2026-08-06T15:00:00Z',
      },
      {
        id: 2,
        autor: { id: 6, nombreUsuario: 'mia_r' },
        contenido: 'Gracias por compartir, justo me llegó uno parecido esta semana.',
        fechaCreacion: '2026-08-06T16:20:00Z',
      },
    ];
  }
}
