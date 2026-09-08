// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'registro', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
      { path: 'recuperar-contrasena', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: 'restablecer-contrasena', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'comunidad', pathMatch: 'full' },
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
      // ✅ RUTA PARA DOCUMENTOS
      { 
        path: 'documentos', 
        loadComponent: () => import('./features/documentos/documentos.component').then(m => m.DocumentosComponent)
      },
      // ✅ RUTA PARA DOCUMENTOS POR CATEGORÍA
      { 
        path: 'documentos/categoria/:categoria', 
        loadComponent: () => import('./features/documentos/documentos.component').then(m => m.DocumentosComponent)
      },
      // ✅ RUTA PARA BIBLIOTECA
      { 
        path: 'biblioteca', 
        loadComponent: () => import('./features/biblioteca/biblioteca.component').then(m => m.BibliotecaComponent)
      },
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
      { 
        path: 'chat', 
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
        canActivate: [authGuard]
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./features/community/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [authGuard]
      },
      { 
        path: 'chat/:usuarioId', 
        loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatComponent),
        canActivate: [authGuard]
      },
    ],
  },
  { path: '**', redirectTo: 'comunidad' },
];