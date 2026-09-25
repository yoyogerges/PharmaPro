import { Component, inject } from '@angular/core';
import { ThemeService } from '@core/services/theme.service';
import { LucideAngularModule, Languages, Sun, Moon } from 'lucide-angular';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex items-center gap-1">
      <button
        type="button"
        (click)="toggleLanguage()"
        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Toggle language"
      >
        <lucide-angular [img]="Languages" class="h-4 w-4"></lucide-angular>
        <span>{{ theme.language() === 'ar' ? 'EN' : 'AR' }}</span>
      </button>
      <button
        type="button"
        (click)="toggleMode()"
        class="inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        title="Toggle theme"
      >
        <lucide-angular [img]="isDark() ? Sun : Moon" class="h-4 w-4"></lucide-angular>
      </button>
    </div>
  `,
})
export class LanguageSwitcherComponent {
  readonly theme = inject(ThemeService);

  isDark() {
    return this.theme.mode() === 'dark';
  }

  toggleLanguage() {
    this.theme.toggleLanguage();
  }

  toggleMode() {
    this.theme.toggleMode();
  }

  protected readonly Languages = Languages;
  protected readonly Sun = Sun;
  protected readonly Moon = Moon;
}