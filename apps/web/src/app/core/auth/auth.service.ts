import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { finalize, tap } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import { EMPTY_USER } from '@core/models/menu.model';
import { TokenService } from '@core/auth/token.service';
import { ApiService } from '@core/services/api.service';
import type { AuthUser, LoginResponse, TokenPair } from '@pharmapro/shared';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly tokenService = inject(TokenService);

  readonly user = signal<AuthUser>(EMPTY_USER);
  readonly isLoading = signal(false);

  get isLoggedIn(): boolean {
    return !!this.tokenService.getAccessToken();
  }
  readonly permissions = computed(() => this.user().permissions);
  readonly roles = computed(() => this.user().roles);

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasAnyPermission(...permissions: string[]): boolean {
    return permissions.some((p) => this.hasPermission(p));
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  async init(): Promise<void> {
    if (!this.tokenService.getAccessToken()) return;
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.api.get<AuthUser>('/auth/me'));
      this.user.set(res);
    } catch {
      this.logout();
    } finally {
      this.isLoading.set(false);
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    this.isLoading.set(true);
    return this.http
      .post<LoginResponse>(`${this.api.baseUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          this.tokenService.setTokens({
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            expiresIn: res.expiresIn,
          });
          this.user.set(res.user);
        }),
        finalize(() => this.isLoading.set(false)),
      );
  }

  logout(): Promise<void> {
    const refreshToken = this.tokenService.hasValidRefreshToken()
      ? this.tokenService.getRefreshToken()
      : null;
    this.tokenService.clear();
    this.user.set(EMPTY_USER);
    if (refreshToken) {
      return this.http
        .post<void>(`${this.api.baseUrl}/auth/logout`, { refreshToken })
        .toPromise()
        .catch(() => undefined)
        .then(() => undefined);
    }
    return Promise.resolve();
  }

  refreshTokens(): Promise<TokenPair | null> {
    const refreshToken = this.tokenService.hasValidRefreshToken()
      ? this.tokenService.getRefreshToken()
      : null;
    if (!refreshToken) return Promise.resolve(null);
    return this.http
      .post<TokenPair>(`${this.api.baseUrl}/auth/refresh`, { refreshToken })
      .toPromise()
      .then((res) => {
        if (!res) return null;
        this.tokenService.setTokens({
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          expiresIn: res.expiresIn,
        });
        return res;
      })
      .catch(() => {
        this.tokenService.clear();
        return null;
      });
  }
}