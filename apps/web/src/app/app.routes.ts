import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./layout/main-layout/main-layout.routes').then((m) => m.mainLayoutRoutes),
  },
  {
    path: '',
    loadChildren: () => import('./layout/auth-layout/auth-layout.routes').then((m) => m.authLayoutRoutes),
  },
  {
    path: 'pos',
    loadChildren: () => import('./features/pos/pos.routes').then((m) => m.posRoutes),
  },
  { path: '**', redirectTo: '/login' },
];