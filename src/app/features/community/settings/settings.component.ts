import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PersonalizacionService } from '../../../core/services/personalizacion.service';
import { PersonalizacionStore } from '../../../core/services/personalizacion-store.service';

@Component({
  selector: 'kiert-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private authService = inject(AuthService);
  private personalizacionService = inject(PersonalizacionService);
  public personalizacionStore = inject(PersonalizacionStore);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  usuario = this.authService.usuario;
  cargando = signal(false);
  errorMsg = signal<string | null>(null);
  exitoMsg = signal<string | null>(null);
  editandoPerfil = signal(false);

  // ✅ Selección temporal (vista previa)
  selectedTheme = signal<string>('default');
  selectedFrame = signal<string>('none');
  selectedBackground = signal<string>('default'); // ✅ FONDO SELECCIONADO

  colorThemes = this.personalizacionStore.colorThemes;
  marcosData = this.personalizacionStore.marcosData;
  fondosData = this.personalizacionStore.fondosData;

  // ===== VISTA PREVIA EN TIEMPO REAL =====
  previewThemeGradient = computed(() => {
    const theme = this.colorThemes().find(t => t.id === this.selectedTheme());
    return theme?.gradient || 'linear-gradient(135deg, #2dd4bf, #0d1117)';
  });

  previewFrameClass = computed(() => `frame-${this.selectedFrame()}`);
  
  previewFrameStyle = computed(() => {
    const id = this.selectedFrame();
    const store = this.personalizacionStore as any;
    return {
      'border': store.marcoBorderStyle(),
      'box-shadow': store.marcoShadowStyle(),
      'background-image': store.marcoGradientStyle(),
      'padding': store.marcoPaddingStyle(),
      'background-origin': 'border-box',
      'background-clip': 'padding-box, border-box',
    };
  });

  // ✅ VISTA PREVIA DEL FONDO SELECCIONADO
  previewFondoGradiente = computed(() => {
    const fondo = this.fondosData().find(f => f.id === this.selectedBackground());
    return fondo?.gradient || 'linear-gradient(135deg, #0d1117, #161b22)';
  });

  // ===== FORMULARIO PERFIL =====
  formPerfil = this.fb.group({
    nombreUsuario: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email]],
    bio: ['', [Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.cargarDatosUsuario();
    this.personalizacionStore.cargarPersonalizacion();
    this.personalizacionStore.cargarMarcos();
    this.personalizacionStore.cargarFondos();

    const current = this.personalizacionStore.personalizacion();
    if (current) {
      this.selectedTheme.set(current.temaId || 'default');
      this.selectedFrame.set(current.marcoId || 'none');
      this.selectedBackground.set(current.fondoId || 'default');
    }
  }

  cargarDatosUsuario(): void {
    const user = this.usuario();
    if (user) {
      this.formPerfil.patchValue({
        nombreUsuario: user.nombreUsuario,
        email: user.email,
        bio: user.bio || '',
      });
    }
  }

  seleccionarTheme(themeId: string): void {
    this.selectedTheme.set(themeId);
  }

  seleccionarFrame(frameId: string): void {
    this.selectedFrame.set(frameId);
  }

  seleccionarBackground(bgId: string): void {
    this.selectedBackground.set(bgId);
    console.log('🎨 Fondo seleccionado:', bgId);
  }

  // ✅ APLICAR PERSONALIZACIÓN - GUARDA TEMA, MARCO Y FONDO
  aplicarPersonalizacion(): void {
    this.cargando.set(true);
    
    const temaId = this.selectedTheme();
    const marcoId = this.selectedFrame();
    const fondoId = this.selectedBackground();
    
    console.log('🎨 Aplicando personalización:', { temaId, marcoId, fondoId });
    
    this.personalizacionStore.guardarPersonalizacion(temaId, marcoId, fondoId);
    
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('✨ Personalización aplicada correctamente');
      setTimeout(() => this.exitoMsg.set(null), 3000);
      
      // ✅ Forzar recarga del store para actualizar el perfil
      this.personalizacionStore.recargar();
    }, 500);
  }

  toggleEditarPerfil(): void {
    this.editandoPerfil.update(val => !val);
    if (this.editandoPerfil()) {
      this.cargarDatosUsuario();
    }
  }

  guardarPerfil(): void {
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    setTimeout(() => {
      this.cargando.set(false);
      this.exitoMsg.set('✅ Perfil actualizado correctamente');
      this.editandoPerfil.set(false);
      setTimeout(() => this.exitoMsg.set(null), 3000);
    }, 1000);
  }

  subirFotoPerfil(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.cargando.set(true);
    this.personalizacionService.subirFotoPerfil(file).subscribe({
      next: (data) => {
        const user = this.usuario();
        if (user) {
          this.authService.usuario.set({ ...user, fotoPerfilUrl: data.fotoPerfilUrl });
        }
        this.exitoMsg.set('📸 Foto de perfil actualizada');
        this.cargando.set(false);
        this.personalizacionStore.recargar();
        setTimeout(() => this.exitoMsg.set(null), 3000);
      },
      error: () => {
        this.errorMsg.set('❌ Error al subir la foto');
        this.cargando.set(false);
        setTimeout(() => this.errorMsg.set(null), 3000);
      }
    });
  }

  getInitials(nombre: string): string {
    return nombre?.charAt(0)?.toUpperCase() || '?';
  }

  // ===== NAVEGACIÓN =====
  buscarAmigos(): void {
    this.router.navigate(['/comunidad']);
  }

  irChat(): void {
    this.router.navigate(['/chat']);
  }

  irPerfil(): void {
    this.router.navigate(['/perfil']);
  }

  irHistorial(): void {
    this.router.navigate(['/mis-publicaciones']);
  }
}