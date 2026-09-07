// src/app/features/documentos/documentos.component.ts
import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DocumentoService } from '../../core/services/documento.service';
import { AuthService } from '../../core/services/auth.service';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';
import { Documento, CrearDocumentoDTO } from '../../core/models/documento.model';

@Component({
  selector: 'kiert-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos.component.html',
  styleUrl: './documentos.component.scss'
})
export class DocumentosComponent implements OnInit {
  private documentoService = inject(DocumentoService);
  private sanitizer = inject(DomSanitizer);
  public authService = inject(AuthService);
  public personalizacionStore = inject(PersonalizacionStore);

  // Estado
  documentos = signal<Documento[]>([]);
  categorias = signal<string[]>([]);
  categoriaSeleccionada = signal<string>('Todas');
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);

  // Modal
  modalAbierto = signal(false);
  modalEditando = signal<Documento | null>(null);
  enviando = signal(false);

  // Formulario
  formTitulo = signal('');
  formDescripcion = signal('');
  formCategoria = signal('');
  formCategoriaPersonalizada = signal('');
  formArchivo = signal<File | null>(null);
  formCategoriaSeleccionada = signal('');

  // Buscador
  busqueda = signal('');

  // Computed
  documentosFiltrados = computed(() => {
    const docs = this.documentos();
    const categoria = this.categoriaSeleccionada();
    const query = this.busqueda().toLowerCase().trim();

    let filtrados = docs;

    if (categoria !== 'Todas') {
      filtrados = filtrados.filter(d => d.categoria === categoria);
    }

    if (query) {
      filtrados = filtrados.filter(d =>
        d.titulo.toLowerCase().includes(query) ||
        d.descripcion.toLowerCase().includes(query)
      );
    }

    return filtrados;
  });

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarDocumentos();
  }

  cargarCategorias(): void {
    this.documentoService.obtenerCategorias().subscribe({
      next: (data) => {
        this.categorias.set(['Todas', ...data]);
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  cargarDocumentos(): void {
    this.cargando.set(true);
    this.documentoService.listarTodos().subscribe({
      next: (data) => {
        this.documentos.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar documentos:', err);
        this.errorMsg.set('Error al cargar los documentos');
        this.cargando.set(false);
      }
    });
  }

  filtrarPorCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
  }

  buscar(): void {
    // La búsqueda se maneja con el computed
  }

  // ========== MODAL ==========

  abrirModal(): void {
    this.modalAbierto.set(true);
    this.modalEditando.set(null);
    this.formTitulo.set('');
    this.formDescripcion.set('');
    this.formCategoria.set('');
    this.formCategoriaPersonalizada.set('');
    this.formArchivo.set(null);
    this.formCategoriaSeleccionada.set('');
    this.errorMsg.set(null);
  }

  abrirModalEditar(documento: Documento): void {
    this.modalAbierto.set(true);
    this.modalEditando.set(documento);
    this.formTitulo.set(documento.titulo);
    this.formDescripcion.set(documento.descripcion);
    this.formCategoriaSeleccionada.set(documento.categoria);
    this.formCategoriaPersonalizada.set(documento.categoriaPersonalizada || '');
    this.formArchivo.set(null);
    this.errorMsg.set(null);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.modalEditando.set(null);
    this.errorMsg.set(null);
  }

  // ========== GUARDAR ==========

  guardarDocumento(): void {
    if (!this.formTitulo().trim()) {
      this.errorMsg.set('El título es obligatorio');
      return;
    }

    if (!this.formDescripcion().trim()) {
      this.errorMsg.set('La descripción es obligatoria');
      return;
    }

    let categoria = this.formCategoriaSeleccionada();
    if (categoria === 'Personalizada' || categoria === '') {
      if (!this.formCategoriaPersonalizada().trim()) {
        this.errorMsg.set('Ingresa el nombre de la categoría personalizada');
        return;
      }
      categoria = this.formCategoriaPersonalizada().trim();
    }

    if (!this.modalEditando() && !this.formArchivo()) {
      this.errorMsg.set('Debes seleccionar un archivo');
      return;
    }

    this.enviando.set(true);
    this.errorMsg.set(null);

    const datos: CrearDocumentoDTO = {
      titulo: this.formTitulo().trim(),
      descripcion: this.formDescripcion().trim(),
      categoria: categoria,
      categoriaPersonalizada: this.formCategoriaPersonalizada().trim() || undefined
    };

    if (this.modalEditando()) {
      this.documentoService.actualizar(this.modalEditando()!.id, datos).subscribe({
        next: (documentoActualizado) => {
          this.documentos.update(lista =>
            lista.map(d => d.id === documentoActualizado.id ? documentoActualizado : d)
          );
          this.exitoMsg.set('Documento actualizado correctamente');
          this.enviando.set(false);
          setTimeout(() => {
            this.exitoMsg.set(null);
            this.cerrarModal();
          }, 1500);
          this.cargarCategorias();
        },
        error: (err) => {
          console.error('Error al actualizar:', err);
          this.errorMsg.set('Error al actualizar el documento');
          this.enviando.set(false);
        }
      });
    } else {
      this.documentoService.crear(datos, this.formArchivo()!).subscribe({
        next: (nuevoDocumento) => {
          this.documentos.update(lista => [nuevoDocumento, ...lista]);
          this.exitoMsg.set('Documento publicado correctamente');
          this.enviando.set(false);
          setTimeout(() => {
            this.exitoMsg.set(null);
            this.cerrarModal();
          }, 1500);
          this.cargarCategorias();
        },
        error: (err) => {
          console.error('Error al crear:', err);
          this.errorMsg.set('Error al publicar el documento');
          this.enviando.set(false);
        }
      });
    }
  }

  // ========== ELIMINAR ==========

  eliminarDocumento(id: number): void {
    if (!confirm('¿Seguro que quieres eliminar este documento?')) return;

    this.documentoService.eliminar(id).subscribe({
      next: () => {
        this.documentos.update(lista => lista.filter(d => d.id !== id));
        this.exitoMsg.set('Documento eliminado');
        setTimeout(() => this.exitoMsg.set(null), 2000);
        this.cargarCategorias();
      },
      error: (err) => {
        console.error('Error al eliminar:', err);
        this.errorMsg.set('Error al eliminar el documento');
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  // ========== DESCARGAR ==========

  descargarDocumento(documento: Documento): void {
    window.open(documento.urlArchivo, '_blank');
    
    this.documentoService.incrementarDescargas(documento.id).subscribe({
      next: () => {
        this.documentos.update(lista =>
          lista.map(d =>
            d.id === documento.id ? { ...d, descargas: d.descargas + 1 } : d
          )
        );
      },
      error: (err) => console.error('Error al incrementar descargas:', err)
    });
  }

  // ========== ARCHIVO ==========

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];
      const maxSize = 20 * 1024 * 1024;

      if (archivo.size > maxSize) {
        this.errorMsg.set('El archivo no debe superar los 20MB');
        this.formArchivo.set(null);
        input.value = '';
        setTimeout(() => this.errorMsg.set(null), 3000);
        return;
      }

      this.formArchivo.set(archivo);
    }
  }

  // ========== UTILIDADES ==========

  getIconoArchivo(tipoArchivo: string): SafeHtml {
    const iconos: Record<string, string> = {
      'pdf': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f85149" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="12" y2="12"/><line x1="15" y1="15" x2="12" y2="12"/></svg>`,
      'doc': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
      'docx': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
      'xls': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>`,
      'xlsx': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>`,
      'ppt': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9ca24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="3"/></svg>`,
      'pptx': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f9ca24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="3"/></svg>`,
      'txt': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b98a5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="16" y2="16"/></svg>`,
      'jpg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      'jpeg': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      'png': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      'gif': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fd79a8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="16" y2="16"/></svg>`,
      'zip': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdcb6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
      'rar': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fdcb6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`
    };
    const svg = iconos[tipoArchivo?.toLowerCase() || ''] || 
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b98a5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  formatearTamano(tamanoKb: number): string {
    if (tamanoKb < 1024) return `${tamanoKb} KB`;
    return `${(tamanoKb / 1024).toFixed(1)} MB`;
  }

  formatearFecha(fecha: Date): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  esAutor(documento: Documento): boolean {
    const usuario = this.authService.usuario();
    return usuario?.id === documento.autor.id;
  }
}