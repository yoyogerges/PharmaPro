import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'ar';
export type ThemeMode = 'light' | 'dark';

const LANG_KEY = 'pp_lang';
const THEME_KEY = 'pp_theme';

const DEFAULT_LANG: AppLanguage = 'en';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly language = signal<AppLanguage>(DEFAULT_LANG);
  readonly mode = signal<ThemeMode>('light');
  readonly isRTL = signal(false);
  readonly direction = signal<'rtl' | 'ltr'>('ltr');

  private readonly translate = inject(TranslateService);

  constructor() {
    this.translate.addLangs(['ar', 'en']);
    const savedLang = this.readStoredLang();
    const savedMode = (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
    this.translate.setDefaultLang(DEFAULT_LANG);
    this.applyMode(savedMode);
    this.applyLanguage(savedLang);
  }

  private readStoredLang(): AppLanguage {
    const stored = localStorage.getItem(LANG_KEY);
    return stored === 'ar' || stored === 'en' ? stored : DEFAULT_LANG;
  }

  applyLanguage(lang: AppLanguage) {
    this.language.set(lang);
    const isRTL = lang === 'ar';
    this.isRTL.set(isRTL);
    this.direction.set(isRTL ? 'rtl' : 'ltr');
    localStorage.setItem(LANG_KEY, lang);
    this.translate.use(lang);

    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }

  toggleLanguage() {
    this.applyLanguage(this.language() === 'ar' ? 'en' : 'ar');
  }

  applyMode(mode: ThemeMode) {
    this.mode.set(mode);
    localStorage.setItem(THEME_KEY, mode);
    const html = document.documentElement;
    html.classList.toggle('dark', mode === 'dark');
    html.style.colorScheme = mode;
  }

  toggleMode() {
    this.applyMode(this.mode() === 'dark' ? 'light' : 'dark');
  }
}