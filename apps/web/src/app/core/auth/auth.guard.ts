import { inject } from '@angular/core';
import type { CanMatchFn } from '@angular/router';
import { Router } from '@angular/router';
import type { UrlSegment } from '@angular/router';
import { AuthService } from './auth.service';

const PUBLIC_PATHS = new Set(['login', 'forgot-password']);

export const authGuard: CanMatchFn = async (_route, segments: UrlSegment[]) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const target = segments.map((s) => s.path).join('/');

  if (authService.isLoggedIn) {
    if (authService.user().permissions.length === 0) {
      await authService.init();
    }
    return true;
  }

  if (PUBLIC_PATHS.has(target)) {
    return true;
  }
  return router.createUrlTree(['/login']);
};