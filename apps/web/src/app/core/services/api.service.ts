import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';

export type QueryParams = Record<string, string | number | boolean | (string | number | boolean)[]>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: QueryParams) {
    return this.http.get<T>(`${this.baseUrl}${path}`, { params: this.toParams(params) });
  }

  post<T>(path: string, body?: unknown, params?: QueryParams) {
    return this.http.post<T>(`${this.baseUrl}${path}`, body ?? {}, { params: this.toParams(params) });
  }

  put<T>(path: string, body?: unknown, params?: QueryParams) {
    return this.http.put<T>(`${this.baseUrl}${path}`, body ?? {}, { params: this.toParams(params) });
  }

  patch<T>(path: string, body?: unknown, params?: QueryParams) {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body ?? {}, { params: this.toParams(params) });
  }

  delete<T>(path: string, params?: QueryParams) {
    return this.http.delete<T>(`${this.baseUrl}${path}`, { params: this.toParams(params) });
  }

  upload<T>(path: string, formData: FormData) {
    return this.http.post<T>(`${this.baseUrl}${path}`, formData);
  }

  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      const values = Array.isArray(value) ? value.map(String) : [String(value)];
      for (const v of values) {
        httpParams = httpParams.append(key, v);
      }
    }
    return httpParams;
  }
}