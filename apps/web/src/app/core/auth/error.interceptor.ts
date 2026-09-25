import { inject } from '@angular/core';
import type { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from './auth.service';
import type { ErrorResponse } from '@pharmapro/shared';

let lastNetworkToastAt = 0;

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const notifications = inject(NotificationService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        const now = Date.now();
        if (now - lastNetworkToastAt >= 15_000) {
          lastNetworkToastAt = now;
          notifications.error('COMMON.errors.network', 'COMMON.errors.network_title', 7000);
        }
      } else if (error.status >= 500) {
        notifications.error('COMMON.errors.server', 'COMMON.errors.server_title');
      } else if (error.status === 429) {
        notifications.warning('COMMON.errors.rate_limited');
      } else if (error.status !== 401) {
        const body = error.error as ErrorResponse | undefined;
        const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
        if (message) {
          notifications.error(message, 'COMMON.errors.operation_failed');
        }
      }
      authService.isLoading.set(false);
      return throwError(() => error);
    }),
  );
};