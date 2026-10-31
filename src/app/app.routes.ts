// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // ===== AUTENTICACIÓN Y RUTAS PÚBLICAS =====
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'registro', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'recuperar-contrasena', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      
      // Ruta pública para procesar el link de invitación
      { 
        path: 'invitacion/:token', 
        loadComponent: () => import('./features/chat/unirse-por-link/unirse-por-link.component').then(m => m.UnirsePorLinkComponent) 
      },
    ],
  },

  // ===== ADMIN LOGIN (pantalla completa, sin navbar) =====
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/auth/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },

  // ===== RUTAS PRINCIPALES (con navbar normal) =====
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'comunidad', pathMatch: 'full' },

      // ---------- COMUNIDAD ----------
      { path: 'comunidad', loadComponent: () => import('./features/community/feed/feed.component').then(m => m.FeedComponent) },
      { path: 'comunidad/nueva-publicacion', loadComponent: () => import('./features/community/create-post/create-post.component').then(m => m.CreatePostComponent) },
      { path: 'comunidad/:id', loadComponent: () => import('./features/community/post-detail/post-detail.component').then(m => m.PostDetailComponent) },
      { path: 'mis-publicaciones', loadComponent: () => import('./features/community/mis-publicaciones/mis-publicaciones.component').then(m => m.MisPublicacionesComponent) },

      // ---------- BIBLIOTECA (pública) ----------
      { path: 'biblioteca', loadComponent: () => import('./features/community/biblioteca/biblioteca.component').then(m => m.BibliotecaComponent) },

      // ---------- ANUNCIOS ----------
      { path: 'anuncios', loadComponent: () => import('./features/community/anuncios/anuncios.component').then(m => m.AnunciosComponent) },

      // ---------- NOTIFICACIONES ----------
      { path: 'notificaciones', loadComponent: () => import('./features/community/notificacion-page/notificaciones-page.component').then(m => m.NotificacionesPageComponent) },

      // ---------- ADMIN ----------
      {
        path: 'admin/reportes',
        loadComponent: () => import('./features/admin/admin-reportes/reporte-admin.component').then(m => m.ReportesAdminComponent),
        canActivate: [adminGuard],
        data: { roles: ['CEO', 'ADMIN', 'MODERADOR'] }
      },
      {
        path: 'admin/anuncios',
        loadComponent: () => import('./features/admin/admin-anuncios/admin-anuncios.component').then(m => m.AdminAnunciosComponent),
        canActivate: [adminGuard],
        data: { roles: ['CEO', 'ADMIN'] }
      },
      {
        path: 'admin/bienvenida',
        loadComponent: () => import('./features/admin/admin-bienvenida/admin-bienvenida.component').then(m => m.AdminBienvenidaComponent),
        canActivate: [adminGuard],
        data: { roles: ['CEO', 'ADMIN', 'MODERADOR'] }
      },
      { path: 'admin', redirectTo: 'admin/reportes', pathMatch: 'full' },

      // ---------- PERFIL ----------
      { path: 'perfil', loadComponent: () => import('./features/community/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'perfil-autor/:id', loadComponent: () => import('./features/community/perfil-autor/perfil-autor.component').then(m => m.PerfilAutorComponent) },
      { path: 'usuario/:id', loadComponent: () => import('./features/community/perfil-autor/perfil-autor.component').then(m => m.PerfilAutorComponent) },

      // ---------- CHAT GLOBAL ----------
      { path: 'chat-global', loadComponent: () => import('./features/chat/chat-global/chat-global.component').then(m => m.ChatGlobalComponent) },

      // ---------- CHAT (Estructura corregida para HMR) ----------
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent)
      },
      {
        path: 'chat/grupo/:id',
        loadComponent: () => import('./features/chat/grupo-chat/grupo-chat.component').then(m => m.GrupoChatComponent)
      },
      {
        path: 'chat/:usuarioId',
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent)
      },

      // ---------- AJUSTES ----------
      { path: 'ajustes', loadComponent: () => import('./features/community/settings/settings.component').then(m => m.SettingsComponent) },

      // ---------- LEGALES ----------
      {
        path: 'legal/privacidad',
        loadComponent: () =>
          import('./features/legal/privacidad/privacidad.component')
            .then(m => m.PrivacidadComponent),
      },
      {
        path: 'legal/cookies',
        loadComponent: () =>
          import('./features/legal/cookies/cookies.component')
            .then(m => m.CookiesComponent),
      },
      {
        path: 'legal/terminos',
        loadComponent: () =>
          import('./features/legal/terminos/terminos.component')
            .then(m => m.TerminosComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];