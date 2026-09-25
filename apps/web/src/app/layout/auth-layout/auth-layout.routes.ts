import type { Routes } from '@angular/router';

export const authLayoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () => import('@features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('@features/auth/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
      },
    ],
  },
];