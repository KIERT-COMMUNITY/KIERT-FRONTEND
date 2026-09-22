// src/app/features/biblioteca/biblioteca.component.ts
import { Component, signal, computed, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BibliotecaService } from '../../core/services/biblioteca.service';
import { RecursoBiblioteca } from '../../core/models/biblioteca.model';
import { PersonalizacionStore } from '../../core/services/personalizacion-store.service';

@Component({
  selector: 'kiert-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss'
})
export class BibliotecaComponent implements OnInit {
  private bibliotecaService = inject(BibliotecaService);
  private sanitizer = inject(DomSanitizer);
  public personalizacionStore = inject(PersonalizacionStore);

  // ===== DATOS =====
  recursos = signal<RecursoBiblioteca[]>([]);
  categorias = signal<string[]>([]);

  // ===== FILTROS =====
  categoriaSeleccionada = signal<string>('todas');
  busqueda = signal<string>('');

  // ===== ESTADO UI =====
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  vista = signal<'grid' | 'lista'>('grid');

  // ===== DROPDOWN CATEGORÍA =====
  dropdownCategoriaAbierto = signal(false);

  // ===== DESTACADOS EXPANDIBLES =====
  destacadosExpandidos = signal(false);
  destacadosPorPagina = 4; // 🔧 Solo 4 destacados por defecto

  destacadosMostrados = computed(() => {
    const todos = this.recursos().filter(r => r.destacado);
    if (this.destacadosExpandidos()) return todos;
    return todos.slice(0, this.destacadosPorPagina);
  });

  destacadosOcultos = computed(() => {
    const total = this.recursos().filter(r => r.destacado).length;
    const mostrados = this.destacadosMostrados().length;
    return Math.max(0, total - mostrados);
  });

  toggleDestacados(): void {
    this.destacadosExpandidos.update(v => !v);
  }

  // ===== PAGINACIÓN DE RECURSOS =====
  recursosExpandidos = signal(false);
  recursosPorPagina = 8; // 🔧 Solo 8 recursos por defecto

  recursosMostrados = computed(() => {
    const filtrados = this.recursosFiltradosComputed();
    if (this.recursosExpandidos()) return filtrados;
    return filtrados.slice(0, this.recursosPorPagina);
  });

  recursosOcultos = computed(() => {
    const total = this.recursosFiltradosComputed().length;
    const mostrados = this.recursosMostrados().length;
    return Math.max(0, total - mostrados);
  });

  toggleRecursos(): void {
    this.recursosExpandidos.update(v => !v);
  }

  // ===== MODAL =====
  mostrarModal = signal(false);
  modoEdicion = signal(false);
  recursoEditandoId = signal<number | null>(null);

  formTitulo = signal('');
  formDescripcion = signal('');
  formUrl = signal('');
  formCategoria = signal<RecursoBiblioteca['categoria']>('curso');
  formSubcategoria = signal('');
  formAutor = signal('');
  formPlataforma = signal('');
  formDuracion = signal('');
  formNivel = signal<'' | 'principiante' | 'intermedio' | 'avanzado'>('');
  formTags = signal('');
  formDestacado = signal(false);
  formError = signal<string | null>(null);

  recursoAEliminar = signal<RecursoBiblioteca | null>(null);

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarRecursos();
  }

  // ===== CARGA =====
  cargarCategorias(): void {
    this.bibliotecaService.obtenerCategorias().subscribe({
      next: (data) => {
        const base = [
          'certificacion',
          'curso',
          'video',
          'articulo',
          'herramienta',
          'libro',
          'idiomas',
          'otro',
          'entretenimiento',
          'juego',
          'recurso'
        ];
        const unicas = Array.from(new Set([...base, ...(data || [])]));
        this.categorias.set(['todas', ...unicas]);
      },
      error: () => {
        this.categorias.set([
          'todas',
          'certificacion',
          'curso',
          'video',
          'articulo',
          'herramienta',
          'libro',
          'idiomas',
          'otro',
          'entretenimiento',
          'juego',
          'recurso'
        ]);
      }
    });
  }

  cargarRecursos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.bibliotecaService.obtenerTodos().subscribe({
      next: (data) => {
        console.log('✅ Recursos cargados desde backend:', data);
        this.recursos.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar recursos:', err);
        this.errorMsg.set('Error al cargar los recursos');
        this.recursos.set([]);
        this.cargando.set(false);
      }
    });
  }

  // ===== COMPUTED =====
  recursosFiltradosComputed = computed(() => {
    let resultado = this.recursos();
    const categoria = this.categoriaSeleccionada();
    const query = this.busqueda().toLowerCase().trim();

    if (categoria !== 'todas') {
      resultado = resultado.filter(r => r.categoria === categoria);
    }
    if (query) {
      resultado = resultado.filter(r =>
        r.titulo?.toLowerCase().includes(query) ||
        r.descripcion?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        r.subcategoria?.toLowerCase().includes(query) ||
        r.autor?.toLowerCase().includes(query) ||
        r.plataforma?.toLowerCase().includes(query)
      );
    }
    return resultado;
  });

  totalRecursos = computed(() => this.recursos().length);
  totalCertificaciones = computed(() =>
    this.recursos().filter(r => r.categoria === 'certificacion').length
  );
  totalCursos = computed(() =>
    this.recursos().filter(r => r.categoria === 'curso').length
  );

  // ===== DROPDOWN CATEGORÍA =====
  contarPorCategoria(categoria: string): number {
    if (categoria === 'todas') return this.recursos().length;
    return this.recursos().filter(r => r.categoria === categoria).length;
  }

  toggleDropdownCategoria(event: Event): void {
    event.stopPropagation();
    this.dropdownCategoriaAbierto.update(v => !v);
  }

  seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
    this.dropdownCategoriaAbierto.set(false);
    this.recursosExpandidos.set(false); // 🔥 Resetear paginación
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownCategoriaAbierto()) return;

    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.dropdown-categoria');

    if (!clickedInside) {
      this.dropdownCategoriaAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dropdownCategoriaAbierto()) {
      this.dropdownCategoriaAbierto.set(false);
    }
  }

  // ===== ACCIONES =====
  filtrarPorCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
    this.dropdownCategoriaAbierto.set(false);
    this.recursosExpandidos.set(false);
  }

  buscarRecursos(): void {
    this.recursosExpandidos.set(false); // 🔥 Resetear al buscar
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada.set('todas');
    this.busqueda.set('');
    this.dropdownCategoriaAbierto.set(false);
    this.recursosExpandidos.set(false); // 🔥 Resetear
    this.destacadosExpandidos.set(false);
  }

  cambiarVista(vista: 'grid' | 'lista'): void {
    this.vista.set(vista);
  }

  abrirEnlace(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== MODAL =====
  abrirModalAgregar(): void {
    this.modoEdicion.set(false);
    this.recursoEditandoId.set(null);
    this.limpiarFormulario();
    this.mostrarModal.set(true);
  }

  abrirModalEditar(recurso: RecursoBiblioteca, event?: Event): void {
    event?.stopPropagation();
    if (!recurso.esUsuario) return;

    this.modoEdicion.set(true);
    this.recursoEditandoId.set(typeof recurso.id === 'number' ? recurso.id : null);
    this.formTitulo.set(recurso.titulo || '');
    this.formDescripcion.set(recurso.descripcion || '');
    this.formUrl.set(recurso.url || '');
    this.formCategoria.set((recurso.categoria as any) || 'curso');
    this.formSubcategoria.set(recurso.subcategoria || '');
    this.formAutor.set(recurso.autor || '');
    this.formPlataforma.set(recurso.plataforma || '');
    this.formDuracion.set(recurso.duracion || '');
    this.formNivel.set((recurso.nivel as any) || '');
    this.formTags.set((recurso.tags || []).join(', '));
    this.formDestacado.set(!!recurso.destacado);
    this.formError.set(null);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.limpiarFormulario();
  }

  limpiarFormulario(): void {
    this.formTitulo.set('');
    this.formDescripcion.set('');
    this.formUrl.set('');
    this.formCategoria.set('curso');
    this.formSubcategoria.set('');
    this.formAutor.set('');
    this.formPlataforma.set('');
    this.formDuracion.set('');
    this.formNivel.set('');
    this.formTags.set('');
    this.formDestacado.set(false);
    this.formError.set(null);
  }

  // ===== GUARDAR =====
  guardarRecurso(): void {
    if (!this.formTitulo().trim()) {
      this.formError.set('El título es obligatorio');
      return;
    }
    if (!this.formUrl().trim()) {
      this.formError.set('La URL es obligatoria');
      return;
    }
    try {
      new URL(this.formUrl());
    } catch {
      this.formError.set('La URL no es válida (debe incluir https://)');
      return;
    }

    const tagsArray = this.formTags()
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const datos = {
      titulo: this.formTitulo().trim(),
      descripcion: this.formDescripcion().trim(),
      url: this.formUrl().trim(),
      categoria: this.formCategoria(),
      subcategoria: this.formSubcategoria().trim() || undefined,
      autor: this.formAutor().trim() || undefined,
      plataforma: this.formPlataforma().trim() || undefined,
      duracion: this.formDuracion().trim() || undefined,
      nivel: this.formNivel() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      destacado: this.formDestacado(),
    };

    const op$ = (this.modoEdicion() && this.recursoEditandoId() !== null)
      ? this.bibliotecaService.actualizarRecursoUsuario(this.recursoEditandoId()!, datos)
      : this.bibliotecaService.agregarRecursoUsuario(datos);

    op$.subscribe({
      next: (guardado) => {
        console.log('✅ Guardado en BD:', guardado);
        this.cerrarModal();
        this.cargarRecursos();
      },
      error: (err) => {
        console.error('❌ Error al guardar:', err);
        console.error('Detalle:', err.error);
        this.formError.set(
          err?.error?.message ||
          err?.error?.detalles?.url ||
          'No se pudo guardar. Revisa la consola.'
        );
      }
    });
  }

  // ===== ELIMINAR =====
  confirmarEliminar(recurso: RecursoBiblioteca, event?: Event): void {
    event?.stopPropagation();
    if (!recurso.esUsuario) return;
    this.recursoAEliminar.set(recurso);
  }

  cancelarEliminar(): void {
    this.recursoAEliminar.set(null);
  }

  eliminarRecurso(): void {
    const recurso = this.recursoAEliminar();
    if (!recurso) return;

    this.bibliotecaService.eliminarRecursoUsuario(recurso.id).subscribe({
      next: () => {
        console.log('✅ Eliminado');
        this.recursoAEliminar.set(null);
        this.cargarRecursos();
      },
      error: (err) => {
        console.error('❌ Error al eliminar:', err);
      }
    });
  }

  // ===== ICONOS =====
  getIconoCategoria(categoria: string): SafeHtml {
    const iconos: Record<string, string> = {
      'certificacion': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
      'curso': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`,
      'video': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
      'articulo': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      'herramienta': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      'libro': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`,
      'idiomas': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
      'entretenimiento': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8"/><path d="M2 8l3-5h14l3 5"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M6 16h.01"/><path d="M10 16h.01"/><path d="M14 16h.01"/><path d="M18 16h.01"/></svg>`,
      'juego': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.152A4 4 0 0 0 17.32 5z"/></svg>`,
      'recurso': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      'otro': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`
    };
    const svg = iconos[categoria?.toLowerCase()] || iconos['libro'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getColorCategoria(categoria: string): string {
    const colores: Record<string, string> = {
      'certificacion': '#f9ca24',
      'curso': '#2dd4bf',
      'video': '#ff6b6b',
      'articulo': '#58a6ff',
      'herramienta': '#6c5ce7',
      'libro': '#fd79a8',
      'idiomas': '#feca57',
      'entretenimiento': '#a29bfe',
      'juego': '#ff9f7a',
      'recurso': '#55efc4',
      'otro': '#8b98a5'
    };
    return colores[categoria?.toLowerCase()] || '#8b98a5';
  }

  formatearCategoria(categoria: string): string {
    if (!categoria) return '';
    if (categoria === 'todas') return 'Todas';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
  }
}