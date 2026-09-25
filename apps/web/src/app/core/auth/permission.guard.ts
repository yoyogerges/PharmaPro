import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { NotificationService } from '@core/services/notification.service';

export const permissionGuard =
  (permission: string): CanActivateFn =>
  () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const notifications = inject(NotificationService);
    if (authService.hasPermission(permission)) {
      return true;
    }
    notifications.warning('COMMON.errors.forbidden');
    return router.createUrlTree(['/dashboard']);
  };