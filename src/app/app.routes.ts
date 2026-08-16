// app.routes.ts -> mapa de TODAS las rutas (URLs) de la aplicación.
// "loadComponent" carga cada componente de forma perezosa (lazy load):
// el navegador solo descarga el código de esa pantalla cuando el usuario
// entra a esa ruta. Esto hace que la web cargue más rápido al inicio.
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    // Rutas de autenticación: usan un layout simple, sin navbar de la comunidad
    path: '',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'registro',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'recuperar-contrasena',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'restablecer-contrasena',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
    ],
  },
  {
    // Rutas "de adentro" de la comunidad: usan el layout principal (navbar + footer)
    // y están protegidas por authGuard (si no hay sesión, redirige a /login)
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'comunidad', pathMatch: 'full' },
      {
        path: 'comunidad',
        loadComponent: () =>
          import('./features/community/feed/feed.component').then(m => m.FeedComponent),
      },
      {
        path: 'comunidad/nueva-publicacion',
        loadComponent: () =>
          import('./features/community/create-post/create-post.component').then(m => m.CreatePostComponent),
      },
      {
        path: 'comunidad/:id',
        loadComponent: () =>
          import('./features/community/post-detail/post-detail.component').then(m => m.PostDetailComponent),
      },
      {
        path: 'comunidad/:id/editar',
        loadComponent: () =>
          import('./features/community/create-post/create-post.component').then(m => m.CreatePostComponent),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat.component').then(m => m.ChatComponent),
      },
      {
        path: 'chat/:usuarioId',
        loadComponent: () =>
          import('./features/chat/chat.component').then(m => m.ChatComponent),
      },
    ],
  },
  // Cualquier ruta no encontrada redirige a la comunidad
  { path: '**', redirectTo: 'comunidad' },
];
