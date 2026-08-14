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
      
      // ✅ RUTA ESPECÍFICA PRIMERO (más específica)
      { 
        path: 'comunidad/nueva-publicacion', 
        loadComponent: () => import('./features/community/create-post/create-post.component').then(m => m.CreatePostComponent),
        canActivate: [authGuard]
      },
      
      // ✅ RUTA GENÉRICA DESPUÉS (con parámetro)
      { 
        path: 'comunidad/:id', 
        loadComponent: () => import('./features/community/post-detail/post-detail.component').then(m => m.PostDetailComponent) 
      },
      
      // ✅ FEED - PÚBLICO
      { 
        path: 'comunidad', 
        loadComponent: () => import('./features/community/feed/feed.component').then(m => m.FeedComponent) 
      },
      
      // ✅ MIS PUBLICACIONES - PROTEGIDO
      { 
        path: 'mis-publicaciones', 
        loadComponent: () => import('./features/community/mis-publicaciones/mis-publicaciones.component').then(m => m.MisPublicacionesComponent),
        canActivate: [authGuard]
      },
      
      // ✅ PERFIL - PROTEGIDO
      { 
        path: 'perfil', 
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
        canActivate: [authGuard]
      },
      
      // ✅ CHAT - PROTEGIDO
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
    ],
  },
  { path: '**', redirectTo: 'comunidad' },
];