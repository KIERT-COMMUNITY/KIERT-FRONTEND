// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // ===== RUTAS DE AUTENTICACIÓN (USUARIOS NORMALES) =====
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'registro',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'recuperar-contrasena',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
    ],
  },

  // ============================================================
  // ✅ ADMIN — LOGIN (público, sin navbar)
  // ============================================================
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(m => m.AdminLoginComponent)
  },

  // ============================================================
  // RUTAS PRINCIPALES (con MainLayout → CON NAVBAR)
  // ============================================================
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'comunidad',
        pathMatch: 'full'
      },

      // ===== COMUNIDAD =====
      {
        path: 'comunidad/nueva-publicacion',
        loadComponent: () => import('./features/community/create-post/create-post.component').then(m => m.CreatePostComponent),
        canActivate: [authGuard]
      },
      {
        path: 'comunidad/:id',
        loadComponent: () => import('./features/community/post-detail/post-detail.component').then(m => m.PostDetailComponent)
      },
      {
        path: 'comunidad',
        loadComponent: () => import('./features/community/feed/feed.component').then(m => m.FeedComponent)
      },
      {
        path: 'mis-publicaciones',
        loadComponent: () => import('./features/community/mis-publicaciones/mis-publicaciones.component').then(m => m.MisPublicacionesComponent),
        canActivate: [authGuard]
      },

      // ===== BIBLIOTECA =====
      {
        path: 'biblioteca',
        loadComponent: () => import('./features/biblioteca/biblioteca.component').then(m => m.BibliotecaComponent)
      },

      // ============================================================
      // ✅ ANUNCIOS — VISTA PÚBLICA (usuarios logueados, solo lectura)
      // ============================================================
      {
        path: 'anuncios',
        loadComponent: () => import('./features/community/anuncios/anuncios.component').then(m => m.AnunciosComponent),
        canActivate: [authGuard]
      },

      // ===== NOTIFICACIONES =====
      {
        path: 'notificaciones',
        loadComponent: () => import('./features/community/notificacion-page/notificaciones-page.component').then(m => m.NotificacionesPageComponent),
        canActivate: [authGuard]
      },

      // ============================================================
      // ✅ ADMIN — PANEL DE REPORTES (con navbar, protegido)
      // ============================================================
      {
        path: 'admin/reportes',
        loadComponent: () =>
          import('./features/admin/admin-reportes/reporte-admin.component').then(m => m.ReportesAdminComponent),
        canActivate: [adminGuard],
        data: { roles: ['CEO', 'ADMIN', 'MODERADOR'] }
      },

      // ============================================================
      // ✅ ADMIN — GESTIÓN DE ANUNCIOS (con navbar, protegido)
      // ============================================================
      {
        path: 'admin/anuncios',
        loadComponent: () =>
          import('./features/admin/admin-anuncios/admin-anuncios.component').then(m => m.AdminAnunciosComponent),
        canActivate: [adminGuard],
        data: { roles: ['CEO', 'ADMIN'] }
      },

      // Redirección /admin → /admin/reportes
      {
        path: 'admin',
        redirectTo: 'admin/reportes',
        pathMatch: 'full'
      },

      // ===== PERFIL =====
      {
        path: 'perfil',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard]
      },
      {
        path: 'perfil-autor/:id',
        loadComponent: () => import('./features/perfil-autor/perfil-autor.component').then(m => m.PerfilAutorComponent)
      },
      {
        path: 'usuario/:id',
        loadComponent: () => import('./features/perfil-autor/perfil-autor.component').then(m => m.PerfilAutorComponent)
      },

      // ===== CHAT =====
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
        canActivate: [authGuard]
      },
      {
        path: 'chat/:usuarioId',
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
        canActivate: [authGuard]
      },
      {
        path: 'chat/grupo/:id',
        loadComponent: () => import('./features/chat/grupo-chat/grupo-chat.component').then(m => m.GrupoChatComponent),
        canActivate: [authGuard]
      },

      // ===== AJUSTES =====
      {
        path: 'ajustes',
        loadComponent: () => import('./features/community/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [authGuard]
      },
    ],
  },

  // ===== RUTA COMODÍN (404) =====
  {
    path: '**',
    redirectTo: 'comunidad'
  },
];