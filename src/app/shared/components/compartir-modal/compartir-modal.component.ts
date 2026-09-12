import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompartidoService } from '../../../core/services/compartido.service';

@Component({
  selector: 'kiert-compartir-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compartir-modal.component.html',
  styleUrl: './compartir-modal.component.scss'
})
export class CompartirModalComponent {
  private fb = inject(FormBuilder);
  private compartidoService = inject(CompartidoService);

  @Input({ required: true }) postId!: number;
  @Input() postTitulo = '';
  @Output() cerrar = new EventEmitter<void>();

  enviando = signal(false);
  enviado = signal(false);
  errorMsg = signal<string | null>(null);
  copiado = signal(false);

  form = this.fb.group({
    comentario: ['', [Validators.maxLength(500)]]
  });

  get urlPost(): string {
    return `${window.location.origin}/comunidad/post/${this.postId}`;
  }

  compartirInterno(): void {
    this.enviando.set(true);
    this.errorMsg.set(null);

    this.compartidoService.compartir(this.postId, {
      tipoCompartido: 'INTERNO',
      comentario: this.form.value.comentario || ''
    }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (err) => {
        this.enviando.set(false);
        this.errorMsg.set(err.error?.error || 'Error al compartir');
      }
    });
  }

  copiarEnlace(): void {
    navigator.clipboard.writeText(this.urlPost).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);

      // Registrar compartido externo
      this.compartidoService.compartir(this.postId, {
        tipoCompartido: 'EXTERNO'
      }).subscribe();
    });
  }

  compartirWhatsApp(): void {
    const texto = encodeURIComponent(`Mira esta publicación: ${this.postTitulo}\n${this.urlPost}`);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
    this.registrarExterno();
  }

  compartirTwitter(): void {
    const texto = encodeURIComponent(`Mira esta publicación: ${this.postTitulo}`);
    const url = encodeURIComponent(this.urlPost);
    window.open(`https://twitter.com/intent/tweet?text=${texto}&url=${url}`, '_blank');
    this.registrarExterno();
  }

  compartirFacebook(): void {
    const url = encodeURIComponent(this.urlPost);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    this.registrarExterno();
  }

  compartirTelegram(): void {
    const texto = encodeURIComponent(`Mira esta publicación: ${this.postTitulo}`);
    const url = encodeURIComponent(this.urlPost);
    window.open(`https://t.me/share/url?url=${url}&text=${texto}`, '_blank');
    this.registrarExterno();
  }

  compartirLinkedIn(): void {
    const url = encodeURIComponent(this.urlPost);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    this.registrarExterno();
  }

  private registrarExterno(): void {
    this.compartidoService.compartir(this.postId, {
      tipoCompartido: 'EXTERNO'
    }).subscribe();
  }
}