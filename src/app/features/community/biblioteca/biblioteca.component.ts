// src/app/features/biblioteca/biblioteca.component.ts
import {
  Component, signal, computed, inject, OnInit, OnDestroy, HostListener, isDevMode
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { BibliotecaService } from '../../../core/services/biblioteca.service';
import { RecursoBiblioteca } from '../../../core/models/biblioteca.model';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvisoLoginComponent } from '../../../shared/components/aviso-login/aviso-login.component';
import {
  safeUrl, isSafeExternalUrl, openExternalSafe, safeClassToken
} from '../../../shared/utils/url-sanitizer';

interface CategoriaInfo {
  id: string;
  label: string;
  count: number;
  color: string;
}

@Component({
  selector: 'kiert-biblioteca',
  standalone: true,
  imports: [CommonModule, FormsModule, AvisoLoginComponent],
  templateUrl: './biblioteca.component.html',
  styleUrl: './biblioteca.component.scss'
})
export class BibliotecaComponent implements OnInit, OnDestroy {
  private bibliotecaService = inject(BibliotecaService);
  public personalizacionStore = inject(PersonalizacionStore);
  private authService = inject(AuthService);
  private router = inject(Router);

  // ===== CICLO DE VIDA =====
  private readonly destroy$ = new Subject<void>();
  private timeouts = new Set<ReturnType<typeof setTimeout>>();

  // ===== DATOS =====
  recursos = signal<RecursoBiblioteca[]>([]);

  // ===== FILTROS =====
  categoriaSeleccionada = signal<string>('todas');
  busqueda = signal<string>('');

  // ===== ESTADO UI =====
  cargando = signal(true);
  errorMsg = signal<string | null>(null);
  vista = signal<'grid' | 'lista'>('grid');

  // ===== AVISO LOGIN =====
  mostrarAvisoLogin = signal(false);

  // ===== DROPDOWN CATEGORIA =====
  dropdownCategoriaAbierto = signal(false);

  // ===== DESTACADOS =====
  destacadosExpandidos = signal(false);
  destacadosPorPagina = 4;

  // ===== MODAL AVISO ENLACE =====
  mostrarAvisoEnlace = signal(false);
  enlaceAAbrir = signal<{ url: string; titulo: string } | null>(null);

  // ===== MODAL AVISO SEGURIDAD =====
  mostrarAvisoSeguridad = signal(true);
  contadorSeguridad = signal(5);
  private avisoSeguridadInterval: ReturnType<typeof setInterval> | null = null;

  // ===== CONFIRM DOMINIO NO CONFIABLE =====
  mostrarConfirmDominio = signal(false);
  dominioAConfirmar = signal<string>('');
  private datosPendientesGuardado: any = null;

  // ===== LISTA BLANCA =====
  private readonly DOMINIOS_CONFIABLES = [
    'coursera.org', 'edx.org', 'udemy.com', 'udacity.com', 'platzi.com',
    'domestika.org', 'crehana.com', 'khanacademy.org', 'classcentral.com',
    'freecodecamp.org', 'codecademy.com', 'aprendesql.dev', 'midu.link',
    'mygreatlearning.com', 'exceedlms.com', 'nobook.com',
    'developer.mozilla.org', 'docs.microsoft.com', 'docs.python.org',
    'docs.oracle.com', 'docs.spring.io', 'angular.io', 'react.dev',
    'vuejs.org', 'nodejs.org', 'kotlinlang.org', 'go.dev', 'rust-lang.org',
    'minecraft.wiki', 'wikipedia.org',
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
    'figma.com', 'notion.so', 'trello.com', 'miro.com',
    'photopea.com', 'ninite.com', 'ventoy.net', 'rufus.ie',
    'optijuegos.net', '4download.net', 'technical.city', 'ifixit.com',
    'duolingo.com', 'babbel.com', 'busuu.com', 'lingoda.com',
    'youtube.com', 'vimeo.com', 'ted.com',
    'medium.com', 'dev.to', 'vidaextra.com', 'scholar.google.com',
    'hackthebox.com', 'tryhackme.com', 'netacad.com',
    'openai.com', 'anthropic.com', 'claude.ai', 'chatgpt.com',
    'gemini.google.com', 'perplexity.ai', 'deepseek.com', 'kimi.ai',
    'grok.com', 'toolify.ai', 'opencode.ai', 'pippit.ai',
    'kaggle.com', 'hackerrank.com', 'leetcode.com', 'codewars.com',
    'encoded.pe', 'rebajitas.com', 'itsfree.dev', 'minecraftsearch.com',
    'frivlegend.com', 'kawaiianimes.app', 'moewalls.com',
    'wallpapercave.com', 'wallpaper.mob.org', 'alphacoders.com',
    'geode-sdk.org', 'viper.pages.dev', 'rojatvdirecta.online',
    'futbollibrefullhd.org', 'capacitacionlaboral.trabajo.gob.pe'
  ];

  /** Clase de tema saneada. */
  get temaClaseSeguro(): string {
    return safeClassToken(this.personalizacionStore.temaId(), 'default');
  }

  get estaLogueado(): boolean {
    return this.authService.estaLogueado();
  }

  // ============================================================
  // CATEGORIAS DINAMICAS
  // ============================================================
  categoriasDisponibles = computed<CategoriaInfo[]>(() => {
    const recursos = this.recursos();
    if (recursos.length === 0) return [];

    const conteo = new Map<string, number>();
    for (const r of recursos) {
      const cat = safeClassToken(r.categoria, 'otro');
      conteo.set(cat, (conteo.get(cat) || 0) + 1);
    }

    return Array.from(conteo.entries())
      .map(([id, count]) => ({
        id,
        label: this.formatearCategoria(id),
        count,
        color: this.getColorCategoria(id)
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.label.localeCompare(b.label);
      });
  });

  totalCategorias = computed(() => this.categoriasDisponibles().length);

  // ===== DESTACADOS =====
  destacadosMostrados = computed(() => {
    const todos = this.recursos().filter(r => r.destacado);
    if (this.destacadosExpandidos()) return todos;
    return todos.slice(0, this.destacadosPorPagina);
  });

  destacadosOcultos = computed(() => {
    const total = this.recursos().filter(r => r.destacado).length;
    return Math.max(0, total - this.destacadosMostrados().length);
  });

  toggleDestacados(): void {
    this.destacadosExpandidos.update(v => !v);
  }

  // ===== PAGINACION =====
  recursosExpandidos = signal(false);
  recursosPorPagina = 8;

  recursosFiltradosComputed = computed(() => {
    let resultado = this.recursos();
    const categoria = this.categoriaSeleccionada();
    const query = this.busqueda().toLowerCase().trim();

    if (categoria !== 'todas') {
      resultado = resultado.filter(r => safeClassToken(r.categoria, 'otro') === categoria);
    }
    if (query) {
      resultado = resultado.filter(r =>
        r.titulo?.toLowerCase().includes(query) ||
        r.descripcion?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        r.subcategoria?.toLowerCase().includes(query) ||
        r.autor?.toLowerCase().includes(query) ||
        r.plataforma?.toLowerCase().includes(query) ||
        r.usuarioNombre?.toLowerCase().includes(query)
      );
    }
    return resultado;
  });

  recursosMostrados = computed(() => {
    const filtrados = this.recursosFiltradosComputed();
    if (this.recursosExpandidos()) return filtrados;
    return filtrados.slice(0, this.recursosPorPagina);
  });

  recursosOcultos = computed(() => {
    const total = this.recursosFiltradosComputed().length;
    return Math.max(0, total - this.recursosMostrados().length);
  });

  toggleRecursos(): void {
    this.recursosExpandidos.update(v => !v);
  }

  // ===== MODAL CREAR/EDITAR =====
  mostrarModal = signal(false);
  modoEdicion = signal(false);
  recursoEditandoId = signal<number | null>(null);

  formTitulo = signal('');
  formDescripcion = signal('');
  formUrl = signal('');
  formCategoria = signal<string>('curso');
  formSubcategoria = signal('');
  formAutor = signal('');
  formPlataforma = signal('');
  formDuracion = signal('');
  formNivel = signal<string>('');
  formTags = signal('');
  formDestacado = signal(false);
  formError = signal<string | null>(null);

  recursoAEliminar = signal<RecursoBiblioteca | null>(null);
  eliminandoRecurso = signal(false);

  ngOnInit(): void {
    this.cargarRecursos();
    this.iniciarAvisoSeguridad();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts.clear();
    if (this.avisoSeguridadInterval) {
      clearInterval(this.avisoSeguridadInterval);
      this.avisoSeguridadInterval = null;
    }
  }

  private safeTimeout(fn: () => void, ms: number): void {
    const id = setTimeout(() => { this.timeouts.delete(id); fn(); }, ms);
    this.timeouts.add(id);
  }

  // ============================================================
  // AVISO SEGURIDAD
  // ============================================================
  private iniciarAvisoSeguridad(): void {
    this.mostrarAvisoSeguridad.set(true);
    this.contadorSeguridad.set(5);

    if (this.avisoSeguridadInterval) clearInterval(this.avisoSeguridadInterval);

    this.avisoSeguridadInterval = setInterval(() => {
      this.contadorSeguridad.update(c => c - 1);
      if (this.contadorSeguridad() <= 0) {
        this.cerrarAvisoSeguridad();
      }
    }, 1000);
  }

  cerrarAvisoSeguridad(): void {
    this.mostrarAvisoSeguridad.set(false);
    if (this.avisoSeguridadInterval) {
      clearInterval(this.avisoSeguridadInterval);
      this.avisoSeguridadInterval = null;
    }
  }

  // ===== CARGA =====
  cargarRecursos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.bibliotecaService.obtenerTodos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.recursos.set(Array.isArray(data) ? data : []);
          this.cargando.set(false);
        },
        error: (err) => {
          if (isDevMode()) console.error('Error al cargar recursos:', err);
          this.errorMsg.set('Error al cargar los recursos');
          this.recursos.set([]);
          this.cargando.set(false);
        }
      });
  }

  // ============================================================
  // COMPUTED
  // ============================================================
  totalRecursos = computed(() => this.recursos().length);
  totalCertificaciones = computed(() =>
    this.recursos().filter(r => safeClassToken(r.categoria, 'otro') === 'certificacion').length
  );
  totalCursos = computed(() =>
    this.recursos().filter(r => safeClassToken(r.categoria, 'otro') === 'curso').length
  );
  totalDeUsuarios = computed(() =>
    this.recursos().filter(r => r.esUsuario).length
  );

  // ===== DROPDOWN =====
  contarPorCategoria(categoria: string): number {
    if (categoria === 'todas') return this.recursos().length;
    const safeCat = safeClassToken(categoria, 'otro');
    return this.recursos().filter(r => safeClassToken(r.categoria, 'otro') === safeCat).length;
  }

  toggleDropdownCategoria(event: Event): void {
    event.stopPropagation();
    this.dropdownCategoriaAbierto.update(v => !v);
  }

  seleccionarCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(safeClassToken(categoria, 'todas'));
    this.dropdownCategoriaAbierto.set(false);
    this.recursosExpandidos.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.dropdownCategoriaAbierto()) return;
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const clickedInside = target.closest('.dropdown-categoria');
    if (!clickedInside) {
      this.dropdownCategoriaAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.dropdownCategoriaAbierto()) this.dropdownCategoriaAbierto.set(false);
    if (this.mostrarAvisoEnlace()) this.cerrarAvisoEnlace();
    if (this.mostrarAvisoSeguridad()) this.cerrarAvisoSeguridad();
    if (this.mostrarAvisoLogin()) this.cerrarAvisoLogin();
    if (this.mostrarConfirmDominio()) this.cancelarConfirmDominio();
  }

  // ===== ACCIONES =====
  buscarRecursos(): void {
    this.recursosExpandidos.set(false);
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada.set('todas');
    this.busqueda.set('');
    this.dropdownCategoriaAbierto.set(false);
    this.recursosExpandidos.set(false);
    this.destacadosExpandidos.set(false);
  }

  cambiarVista(vista: 'grid' | 'lista'): void {
    this.vista.set(vista);
  }

  // ============================================================
  // AVISO LOGIN
  // ============================================================
  irALogin(): void {
    this.mostrarAvisoLogin.set(false);
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/biblioteca' } });
  }

  cerrarAvisoLogin(): void {
    this.mostrarAvisoLogin.set(false);
  }

  // ============================================================
  // VALIDACION Y APERTURA DE ENLACES
  // ============================================================
  esDominioConfiable(url: string): boolean {
    if (!url) return false;
    const safe = safeUrl(url);
    if (!safe) return false;
    try {
      const parsed = new URL(safe);
      // Solo http(s)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return this.DOMINIOS_CONFIABLES.some(
        d => host === d || host.endsWith('.' + d)
      );
    } catch {
      return false;
    }
  }

  getDominio(url: string): string {
    if (!url) return '';
    const safe = safeUrl(url);
    if (!safe) return '';
    try {
      const host = new URL(safe).hostname;
      return host.replace(/^www\./, '');
    } catch {
      return '';
    }
  }

  abrirEnlace(url: string, titulo?: string): void {
    const safe = safeUrl(url);
    if (!safe) {
      this.errorMsg.set('Enlace no valido');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      return;
    }
    if (this.esDominioConfiable(safe)) {
      openExternalSafe(safe);
      return;
    }
    this.enlaceAAbrir.set({ url: safe, titulo: titulo || 'Recurso' });
    this.mostrarAvisoEnlace.set(true);
  }

  confirmarAbrirEnlace(): void {
    const enlace = this.enlaceAAbrir();
    if (!enlace) return;
    // Revalidar antes de abrir
    if (!isSafeExternalUrl(enlace.url)) {
      this.errorMsg.set('Enlace no permitido');
      this.safeTimeout(() => this.errorMsg.set(null), 3000);
      this.cerrarAvisoEnlace();
      return;
    }
    openExternalSafe(enlace.url);
    this.cerrarAvisoEnlace();
  }

  cerrarAvisoEnlace(): void {
    this.mostrarAvisoEnlace.set(false);
    this.enlaceAAbrir.set(null);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ===== MODAL CREAR/EDITAR =====
  abrirModalAgregar(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }
    this.modoEdicion.set(false);
    this.recursoEditandoId.set(null);
    this.limpiarFormulario();
    this.mostrarModal.set(true);
  }

  abrirModalEditar(recurso: RecursoBiblioteca, event?: Event): void {
    event?.stopPropagation();
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }
    if (!recurso.esUsuario) return;

    this.modoEdicion.set(true);
    this.recursoEditandoId.set(typeof recurso.id === 'number' ? recurso.id : null);
    this.formTitulo.set(recurso.titulo || '');
    this.formDescripcion.set(recurso.descripcion || '');
    this.formUrl.set(recurso.url || '');
    this.formCategoria.set(safeClassToken(recurso.categoria, 'curso'));
    this.formSubcategoria.set(recurso.subcategoria || '');
    this.formAutor.set(recurso.autor || '');
    this.formPlataforma.set(recurso.plataforma || '');
    this.formDuracion.set(recurso.duracion || '');
    this.formNivel.set((recurso.nivel as string) || '');
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

  // ============================================================
  // GUARDAR (con modal propio para dominio no confiable)
  // ============================================================
  guardarRecurso(): void {
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      this.cerrarModal();
      return;
    }

    const titulo = this.formTitulo().trim();
    const urlRaw = this.formUrl().trim();
    const descripcion = this.formDescripcion().trim();

    if (!titulo) {
      this.formError.set('El titulo es obligatorio');
      return;
    }
    if (titulo.length > 200) {
      this.formError.set('El titulo no puede superar 200 caracteres');
      return;
    }
    if (!urlRaw) {
      this.formError.set('La URL es obligatoria');
      return;
    }
    if (urlRaw.length > 2048) {
      this.formError.set('La URL no puede superar 2048 caracteres');
      return;
    }
    if (!urlRaw.startsWith('https://')) {
      this.formError.set('La URL debe comenzar con https://');
      return;
    }
    if (!isSafeExternalUrl(urlRaw)) {
      this.formError.set('La URL no es valida (solo http/https)');
      return;
    }
    if (descripcion.length > 1000) {
      this.formError.set('La descripcion no puede superar 1000 caracteres');
      return;
    }

    // Nivel: whitelist
    const nivelRaw = this.formNivel();
    const nivelesPermitidos = ['', 'principiante', 'intermedio', 'avanzado'];
    const nivel = nivelesPermitidos.includes(nivelRaw) ? nivelRaw : '';

    // Tags: max 10, max 30 chars cada uno
    const tagsArray = this.formTags()
      .split(',')
      .map(t => t.trim().slice(0, 30))
      .filter(t => t.length > 0)
      .slice(0, 10);

    const datos = {
      titulo,
      descripcion,
      url: urlRaw,
      categoria: safeClassToken(this.formCategoria(), 'otro'),
      subcategoria: this.formSubcategoria().trim().slice(0, 100) || undefined,
      autor: this.formAutor().trim().slice(0, 100) || undefined,
      plataforma: this.formPlataforma().trim().slice(0, 100) || undefined,
      duracion: this.formDuracion().trim().slice(0, 50) || undefined,
      nivel: nivel || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      destacado: this.formDestacado(),
    };

    // Si el dominio no es confiable, pedir confirmacion con modal propio
    if (!this.esDominioConfiable(urlRaw)) {
      this.dominioAConfirmar.set(this.getDominio(urlRaw));
      this.datosPendientesGuardado = datos;
      this.mostrarConfirmDominio.set(true);
      return;
    }

    this.ejecutarGuardado(datos);
  }

  confirmarGuardadoDominio(): void {
    const datos = this.datosPendientesGuardado;
    this.mostrarConfirmDominio.set(false);
    this.dominioAConfirmar.set('');
    this.datosPendientesGuardado = null;
    if (datos) this.ejecutarGuardado(datos);
  }

  cancelarConfirmDominio(): void {
    this.mostrarConfirmDominio.set(false);
    this.dominioAConfirmar.set('');
    this.datosPendientesGuardado = null;
  }

  private ejecutarGuardado(datos: any): void {
    const op$ = (this.modoEdicion() && this.recursoEditandoId() !== null)
      ? this.bibliotecaService.actualizarRecursoUsuario(this.recursoEditandoId()!, datos)
      : this.bibliotecaService.agregarRecursoUsuario(datos);

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.cerrarModal();
        this.cargarRecursos();
      },
      error: (err) => {
        if (isDevMode()) console.error('Error al guardar:', err);
        let mensaje = 'No se pudo guardar el recurso';
        if (err?.error?.message) mensaje = String(err.error.message);
        else if (err?.error?.error) mensaje = String(err.error.error);
        if (mensaje.length > 300) mensaje = mensaje.slice(0, 300) + '...';
        this.formError.set(mensaje);
      }
    });
  }

  // ============================================================
  // ELIMINAR
  // ============================================================
  confirmarEliminar(recurso: RecursoBiblioteca, event?: Event): void {
    event?.stopPropagation();
    if (!this.estaLogueado) {
      this.mostrarAvisoLogin.set(true);
      return;
    }
    if (!recurso.esUsuario) return;
    this.recursoAEliminar.set(recurso);
  }

  cancelarEliminar(): void {
    if (this.eliminandoRecurso()) return;
    this.recursoAEliminar.set(null);
  }

  eliminarRecurso(): void {
    const recurso = this.recursoAEliminar();
    if (!recurso) return;

    this.eliminandoRecurso.set(true);
    this.bibliotecaService.eliminarRecursoUsuario(recurso.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.eliminandoRecurso.set(false);
          this.recursoAEliminar.set(null);
          this.cargarRecursos();
        },
        error: (err) => {
          if (isDevMode()) console.error('Error al eliminar:', err);
          this.eliminandoRecurso.set(false);
          this.recursoAEliminar.set(null);
          this.errorMsg.set('No se pudo eliminar el recurso');
          this.safeTimeout(() => this.errorMsg.set(null), 3000);
        }
      });
  }

  // ============================================================
  // ICONOS Y COLORES
  // NOTA: getIconoCategoria ahora devuelve el SVG como string.
  // En el HTML se usara [innerHTML] SIN bypassSecurityTrustHtml
  // (Angular sanitiza el string automaticamente).
  // ============================================================
  getIconoCategoria(categoria: string): string {
    const key = safeClassToken(categoria, 'libro');
    const iconos: Record<string, string> = {
      'certificacion': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      'curso': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/></svg>',
      'video': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      'articulo': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
      'herramienta': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      'libro': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>',
      'idiomas': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      'entretenimiento': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8"/><path d="M2 8l3-5h14l3 5"/><path d="M6 12h.01"/><path d="M10 12h.01"/><path d="M14 12h.01"/><path d="M18 12h.01"/><path d="M6 16h.01"/><path d="M10 16h.01"/><path d="M14 16h.01"/><path d="M18 16h.01"/></svg>',
      'juego': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.152A4 4 0 0 0 17.32 5z"/></svg>',
      'recurso': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      'otro': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'
    };
    return iconos[key] || iconos['libro'];
  }

  getColorCategoria(categoria: string): string {
    const key = safeClassToken(categoria, 'otro');
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
    return colores[key] || '#8b98a5';
  }

  formatearCategoria(categoria: string): string {
    if (!categoria) return '';
    if (categoria === 'todas') return 'Todas';
    const safe = safeClassToken(categoria, '');
    if (!safe) return '';
    return safe.charAt(0).toUpperCase() + safe.slice(1);
  }

  esRecursoDeUsuario(recurso: RecursoBiblioteca): boolean {
    return !!recurso.esUsuario;
  }

  getNombreAutor(recurso: RecursoBiblioteca): string {
    return recurso.usuarioNombre || 'Usuario anonimo';
  }
}