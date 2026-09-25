import { inject } from '@angular/core';
import type { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, from, Observable, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { ApiService } from '@core/services/api.service';

let isRefreshing = false;
let pendingRequests: Array<{ retry: () => void }> = [];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const api = inject(ApiService);

  const accessToken = tokenService.getAccessToken();
  let authReq = req;
  if (accessToken) {
    authReq = req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint(req.url)) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        return new Observable<HttpEvent<unknown>>((subscriber) => {
          pendingRequests.push({ retry: () => next(authReq).subscribe(subscriber) });
        });
      }

      isRefreshing = true;
      return from(authService.refreshTokens()).pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          if (!tokens) {
            pendingRequests = [];
            router.navigate(['/login']);
            return throwError(() => error);
          }
          const retried = pendingRequests;
          pendingRequests = [];
          retried.forEach((r) => r.retry());
          const newReq = req.clone({
            setHeaders: { Authorization: `Bearer ${tokenService.getAccessToken()}` },
          });
          return next(newReq);
        }),
        catchError((err) => {
          isRefreshing = false;
          pendingRequests = [];
          tokenService.clear();
          router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );

  function isAuthEndpoint(url: string): boolean {
    return url.includes('/auth/');
  }
};