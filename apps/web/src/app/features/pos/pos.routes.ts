import type { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { permissionGuard } from '@core/auth/permission.guard';

export const posRoutes: Routes = [
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('../../layout/pos-layout/pos-layout.component').then((m) => m.PosLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [permissionGuard('sales.create')],
        loadComponent: () => import('./pos.component').then((m) => m.PosComponent),
      },
    ],
  },
];