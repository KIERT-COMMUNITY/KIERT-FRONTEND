import { Component, signal, computed, inject, OnInit } from '@angular/core';
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

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarRecursos();
  }

  // ===== CARGA DE DATOS =====
  cargarCategorias(): void {
    this.bibliotecaService.obtenerCategorias().subscribe({
      next: (data) => this.categorias.set(['todas', ...data]),
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.categorias.set(['todas']);
      }
    });
  }

  cargarRecursos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.bibliotecaService.obtenerTodos().subscribe({
      next: (data) => {
        this.recursos.set(data || []);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar recursos:', err);
        this.errorMsg.set('Error al cargar los recursos');
        this.recursos.set([]);
        this.cargando.set(false);
      }
    });
  }

  // ===== COMPUTED: RECURSOS FILTRADOS =====
  recursosFiltradosComputed = computed(() => {
    let resultado = this.recursos();
    const categoria = this.categoriaSeleccionada();
    const query = this.busqueda().toLowerCase().trim();

    // Filtrar por categoría
    if (categoria !== 'todas') {
      resultado = resultado.filter(r => r.categoria === categoria);
    }

    // Filtrar por búsqueda
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

  // ===== COMPUTED: DESTACADOS =====
  destacados = computed(() => {
    return this.recursos().filter(r => r.destacado);
  });

  // ===== COMPUTED: CONTADORES =====
  totalRecursos = computed(() => this.recursos().length);
  totalCertificaciones = computed(() =>
    this.recursos().filter(r => r.categoria === 'certificacion').length
  );
  totalCursos = computed(() =>
    this.recursos().filter(r => r.categoria === 'curso').length
  );

  // ===== ACCIONES =====
  filtrarPorCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
  }

  buscarRecursos(): void {
    // El filtro se aplica automáticamente con el computed
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada.set('todas');
    this.busqueda.set('');
  }

  cambiarVista(vista: 'grid' | 'lista'): void {
    this.vista.set(vista);
  }

  abrirEnlace(url: string): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ===== ICONOS SVG POR CATEGORÍA =====
  getIconoCategoria(categoria: string): SafeHtml {
    const iconos: Record<string, string> = {
      'certificacion': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
      'curso': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`,
      'video': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
      'articulo': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      'herramienta': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
      'libro': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`,
      'idiomas': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
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
      'idiomas': '#feca57'
    };
    return colores[categoria?.toLowerCase()] || '#8b98a5';
  }

  // ===== FORMATEAR CATEGORÍA =====
  formatearCategoria(categoria: string): string {
    if (!categoria) return '';
    if (categoria === 'todas') return 'Todas';
    return categoria.charAt(0).toUpperCase() + categoria.slice(1);
  }
}