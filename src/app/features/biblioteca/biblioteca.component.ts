// src/app/features/biblioteca/biblioteca.component.ts
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

  // Recursos
  recursos = signal<RecursoBiblioteca[]>([]);
  recursosFiltrados = signal<RecursoBiblioteca[]>([]);

  // Filtros
  categoriaSeleccionada = signal<string>('todas');
  busqueda = signal('');

  // Categorías
  categorias = signal<string[]>([]);

  // Estado
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  vista = signal<'grid' | 'lista'>('grid');

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarRecursos();
  }

  cargarCategorias(): void {
    this.bibliotecaService.obtenerCategorias().subscribe({
      next: (data) => {
        this.categorias.set(['todas', ...data]);
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
        this.errorMsg.set('Error al cargar categorías');
      }
    });
  }

  cargarRecursos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);
    
    this.bibliotecaService.obtenerTodos().subscribe({
      next: (data) => {
        this.recursos.set(data);
        this.recursosFiltrados.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar recursos:', err);
        this.errorMsg.set('Error al cargar los recursos');
        this.cargando.set(false);
      }
    });
  }

  // Computed para recursos filtrados
  recursosFiltradosComputed = computed(() => {
    let resultado = this.recursos();
    const categoria = this.categoriaSeleccionada();
    const query = this.busqueda().toLowerCase().trim();

    if (categoria !== 'todas') {
      resultado = resultado.filter(r => r.categoria === categoria);
    }

    if (query) {
      resultado = resultado.filter(r =>
        r.titulo.toLowerCase().includes(query) ||
        r.descripcion.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        r.subcategoria?.toLowerCase().includes(query) ||
        r.autor?.toLowerCase().includes(query)
      );
    }

    return resultado;
  });

  // Destacados
  destacados = computed(() => {
    return this.recursos().filter(r => r.destacado);
  });

  // Métodos de filtrado
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

  // ===== ICONOS SVG POR CATEGORÍA =====
  getIconoCategoria(categoria: string): SafeHtml {
    const iconos: Record<string, string> = {
      'certificacion': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
      'curso': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>`,
      'video': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="8" y1="2" x2="8" y2="22"/><line x1="16" y1="2" x2="16" y2="22"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="16" x2="22" y2="16"/></svg>`,
      'articulo': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      'herramienta': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
      'libro': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`
    };
    const svg = iconos[categoria] || iconos['libro'];
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getColorCategoria(categoria: string): string {
    const colores: Record<string, string> = {
      'certificacion': '#f9ca24',
      'curso': '#2dd4bf',
      'video': '#ff6b6b',
      'articulo': '#58a6ff',
      'herramienta': '#6c5ce7',
      'libro': '#fd79a8'
    };
    return colores[categoria] || '#8b98a5';
  }

  abrirEnlace(url: string): void {
    window.open(url, '_blank');
  }

  // Contadores
  totalRecursos = computed(() => this.recursos().length);
  totalCertificaciones = computed(() => 
    this.recursos().filter(r => r.categoria === 'certificacion').length
  );
  totalCursos = computed(() => 
    this.recursos().filter(r => r.categoria === 'curso').length
  );
}