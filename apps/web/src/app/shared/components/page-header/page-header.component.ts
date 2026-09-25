import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <nav class="mb-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500" aria-label="breadcrumb">
          <a routerLink="/dashboard" class="transition hover:text-slate-600 dark:hover:text-slate-300">
            {{ breadcrumbHome() }}
          </a>
          @for (crumb of crumbs(); track $index) {
            <span>/</span>
            <span>{{ crumb }}</span>
          }
        </nav>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly breadcrumbHome = input('HOME');
  readonly crumbs = input<string[]>([]);
}