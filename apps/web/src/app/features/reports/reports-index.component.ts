import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Table2 } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

interface ReportDefinition {
  type: string;
  title: string;
  description: string;
  requiresDateRange: boolean;
}

@Component({
  selector: 'app-reports-index',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, PageHeaderComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('REPORTS.title' | translate)" [crumbs]="[('NAV.reports' | translate)]" [subtitle]="('REPORTS.description' | translate)" />

      @if (loading()) {
        <p class="text-sm text-slate-400">{{ 'COMMON.loading' | translate }}</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (report of definitions(); track report.type) {
            <button
              type="button"
              (click)="router.navigate(['/reports', report.type])"
              class="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-primary-300 hover:shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
            >
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <lucide-angular [img]="Table2" class="h-5 w-5"></lucide-angular>
              </div>
              <div>
                <h3 class="text-sm font-semibold text-slate-800 transition group-hover:text-primary-600 dark:text-slate-100 dark:group-hover:text-primary-300">
                  {{ report.title }}
                </h3>
                <p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{{ report.description }}</p>
              </div>
              @if (report.requiresDateRange) {
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {{ 'REPORTS.requires_date_range' | translate }}
                </span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class ReportsIndexComponent {
  private readonly api = inject(ApiService);
  readonly router = inject(Router);

  readonly loading = signal(true);
  readonly definitions = signal<ReportDefinition[]>([]);

  protected readonly Table2 = Table2;

  ngOnInit() {
    this.api.get<PaginatedData<ReportDefinition> | ReportDefinition[]>('/reports').subscribe({
      next: (res) => {
        const items = Array.isArray(res) ? res : res.items;
        this.definitions.set(items ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}