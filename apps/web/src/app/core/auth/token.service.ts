import { Injectable } from '@angular/core';

const KEY = 'pp_tokens';

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

@Injectable({ providedIn: 'root' })
export class TokenService {
  getTokens(): StoredTokens | null {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredTokens;
    } catch {
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.getTokens()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.getTokens()?.refreshToken ?? null;
  }

  hasValidRefreshToken(): boolean {
    const token = this.getRefreshToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.exp) return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
    return true;
  }

  setTokens(tokens: StoredTokens): void {
    localStorage.setItem(KEY, JSON.stringify(tokens));
  }

  updateAccessToken(accessToken: string, expiresIn?: number): void {
    const current = this.getTokens();
    if (current) {
      current.accessToken = accessToken;
      if (expiresIn) current.expiresIn = expiresIn;
      this.setTokens(current);
    }
  }

  clear(): void {
    localStorage.removeItem(KEY);
  }
}