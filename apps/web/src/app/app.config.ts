import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import type { ApplicationConfig } from '@angular/core';
import { provideZoneChangeDetection } from '@angular/core';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import type { TranslationObject } from '@ngx-translate/core';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/auth/error.interceptor';
import { routes } from './app.routes';

export class HttpTranslateLoader extends TranslateLoader {
  constructor(private readonly http: HttpClient) {
    super();
  }

  override getTranslation(lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>(`./i18n/${lang}.json`);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideTranslateService({
      fallbackLang: 'en',
      loader: {
        provide: TranslateLoader,
        useClass: HttpTranslateLoader,
        deps: [HttpClient],
      },
    }),
  ],
};