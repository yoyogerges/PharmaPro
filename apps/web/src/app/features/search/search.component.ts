import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Search } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface Section {
  key: string;
  label: string;
  rows: any[];
}

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SEARCH.title' | translate)" [crumbs]="[('TOPBAR.search' | translate)]" [subtitle]="query() ? ('SEARCH.results_for' | translate) + ' „' + query() + '”' : ('SEARCH.hint' | translate)" />

      @if (!query()) {
        <app-empty-state [title]="('SEARCH.no_query' | translate)" [message]="('SEARCH.type_placeholder' | translate)" />
      } @else if (loading()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          {{ 'COMMON.loading' | translate }}
        </div>
      } @else if (total() === 0) {
        <app-empty-state [title]="('SEARCH.no_results' | translate)" [message]="totalMessage()" />
      } @else {
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ totalText() }}</p>
        @for (section of sections(); track section.key) {
          @if (section.rows.length > 0) {
            <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <header class="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                <lucide-angular [img]="Search" class="h-4 w-4 text-primary-500"></lucide-angular>
                <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ section.label | translate }} ({{ section.rows.length }})</h3>
              </header>
              <ul class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (row of section.rows; track track(row)) {
                  <li
                    [class.cursor-pointer]="rowLink(section.key, row)"
                    (click)="open(section.key, row)"
                    class="group flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{{ primaryText(section.key, row) }}</p>
                      <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ secondaryText(section.key, row) }}</p>
                    </div>
                    @if (rowLink(section.key, row)) {
                      <span class="shrink-0 text-xs font-semibold text-primary-600 opacity-0 transition group-hover:opacity-100">{{ 'COMMON.view' | translate }}</span>
                    }
                  </li>
                }
              </ul>
            </section>
          }
        }
      }
    </div>
  `,
})
export class SearchComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly query = signal('');
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly sections = signal<Section[]>([]);

  protected readonly Search = Search;

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const q = (params['q'] ?? '').toString().trim();
      this.query.set(q);
      if (q) this.search(q);
    });
  }

  totalText(): string {
    return `${this.translate.instant('SEARCH.total_results')}: ${this.total()}`;
  }

  totalMessage(): string {
    return `${this.translate.instant('SEARCH.try_different')}: ${this.query()}`;
  }

  track(row: any): string {
    return `${row.id}-${row.invoiceNumber ?? ''}`;
  }

  primaryText(key: string, row: any): string {
    if (key === 'sales') return `${row.invoiceNumber}`;
    if (key === 'products') return [row.name, row.brandName].filter(Boolean).join(' · ');
    if (key === 'customers' || key === 'suppliers') return row.name;
    if (key === 'manufacturers') return row.name;
    return row.name ?? '';
  }

  secondaryText(key: string, row: any): string {
    if (key === 'sales') return `${row.customer?.name ?? '—'} · ${row.totalAmount ?? 0}`;
    if (key === 'products') return [row.sku, row.barcode, row.sellingPrice].filter((v) => v !== undefined && v !== null && v !== '').join(' · ');
    if (key === 'customers') return [row.phone, row.email].filter(Boolean).join(' · ') || '—';
    if (key === 'suppliers') return [row.contactPerson, row.phone].filter(Boolean).join(' · ') || '—';
    if (key === 'manufacturers') return row.country ?? '—';
    return '';
  }

  rowLink(key: string, row: any): boolean {
    return key === 'sales' && !!row.id;
  }

  open(key: string, row: any) {
    if (key === 'sales' && row.id) {
      this.router.navigate(['/sales', row.id]);
    }
  }

  private search(q: string) {
    this.loading.set(true);
    this.api
      .get<{ query: string; count: number; results: Record<string, any[]> }>('/search', { q })
      .subscribe({
        next: (res) => {
          const order = ['products', 'customers', 'suppliers', 'manufacturers', 'sales'] as const;
          const labels: Record<string, string> = {
            products: 'SEARCH.products',
            customers: 'SEARCH.customers',
            suppliers: 'SEARCH.suppliers',
            manufacturers: 'SEARCH.manufacturers',
            sales: 'SEARCH.sales',
          };
          this.sections.set(order.map((key) => ({ key, label: labels[key], rows: res.results[key] ?? [] })).filter((s) => s.rows.length > 0));
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }
}