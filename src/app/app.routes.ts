// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
export const routes: Routes = [
  // ===== RUTAS DE AUTENTICACIÓN =====
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
      { 
        path: 'restablecer-contrasena', 
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) 
      },
    ],
  },

  // ===== RUTAS PRINCIPALES (con MainLayout) =====
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      // Redirección por defecto
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

      // ===== DOCUMENTOS =====
      { 
        path: 'documentos', 
        loadComponent: () => import('./features/documentos/documentos.component').then(m => m.DocumentosComponent)
      },
      { 
        path: 'documentos/categoria/:categoria', 
        loadComponent: () => import('./features/documentos/documentos.component').then(m => m.DocumentosComponent)
      },

      // ===== BIBLIOTECA =====
      { 
        path: 'biblioteca', 
        loadComponent: () => import('./features/biblioteca/biblioteca.component').then(m => m.BibliotecaComponent)
      },

      // ===== NOTIFICACIONES (NUEVA) =====
      { 
        path: 'notificaciones', 
        loadComponent: () => import('./features/community/notificacion-page/notificaciones-page.component').then(m => m.NotificacionesPageComponent),
        canActivate: [authGuard]
      },
      
// ===== ADMIN - REPORTES =====
// ===== ADMIN - REPORTES =====
{
  path: 'admin/reportes',
  loadComponent: () => import('./features/admin/reporte-admin.component')
    .then(m => m.ReportesAdminComponent),
  canActivate: [authGuard, adminGuard]
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