import { Component, inject, signal } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Download, RefreshCw } from 'lucide-angular';
import { environment } from '@env/environment';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface ReportColumn extends TableColumn<Record<string, unknown>> {}

interface ReportResult {
  type: string;
  title: string;
  description: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
  generatedAt: string;
}

@Component({
  selector: 'app-reports-viewer',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, DecimalPipe, DatePipe, PageHeaderComponent, DataTableComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header
          [title]="result()?.title ?? type()"
          [crumbs]="[('NAV.reports' | translate), (result()?.title ?? type())]"
          [subtitle]="result()?.description"
        />
        <div class="flex items-center gap-2">
          @if (canExport()) {
            <button
              type="button"
              [disabled]="exporting()"
              (click)="exportCsv()"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              <lucide-angular [img]="Download" class="h-4 w-4"></lucide-angular>
              {{ 'REPORTS.export_csv' | translate }}
            </button>
          }
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="RefreshCw" class="h-4 w-4"></lucide-angular>
            {{ 'REPORTS.generate' | translate }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <app-date-range-picker (changed)="onDateRange($event)" />
      </div>

      @if (result()?.generatedAt) {
        <p class="text-xs text-slate-400">
          {{ 'REPORTS.generated_at' | translate }}: {{ result()!.generatedAt | date: 'medium' }} · {{ rows().length }} {{ 'COMMON.rows' | translate }}
        </p>
      }

      @if (totalsEntries().length > 0) {
        <div class="flex flex-wrap gap-2">
          @for (item of totalsEntries(); track item.key) {
            <span class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {{ item.key }}: {{ item.value | number: '1.2-2' }}
            </span>
          }
        </div>
      }

      <app-data-table
        [columns]="tableColumns()"
        [rows]="rows()"
        [loading]="loading()"
        [hasActions]="false"
        [showPagination]="false"
        [emptyTitle]="'COMMON.empty.no_data'"
      />
    </div>
  `,
})
export class ReportsViewerComponent {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly notifications = inject(NotificationService);

  readonly type = signal('');
  readonly dateFrom = signal(this.daysAgo(30));
  readonly dateTo = signal(this.today());

  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly result = signal<ReportResult | null>(null);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly tableColumns = signal<ReportColumn[]>([]);

  protected readonly Download = Download;
  protected readonly RefreshCw = RefreshCw;

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const type = params.get('type') ?? '';
      if (type !== this.type()) {
        this.type.set(type);
        this.result.set(null);
        this.load();
      }
    });
  }

  canExport(): boolean {
    return this.authService.hasPermission('reports.export');
  }

  totalsEntries(): { key: string; value: number }[] {
    const totals = this.result()?.totals;
    if (!totals) return [];
    return Object.entries(totals).map(([key, value]) => ({ key, value }));
  }

  onDateRange(range: DateRange) {
    this.dateFrom.set(range.start || this.dateFrom());
    this.dateTo.set(range.end || this.dateTo());
  }

  load() {
    this.loading.set(true);
    this.api
      .get<ReportResult>(`/reports/${this.type()}`, {
        dateFrom: this.dateFrom(),
        dateTo: this.dateTo(),
      })
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.tableColumns.set(res.columns ?? []);
          this.rows.set(this.formatRows(res));
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }

  exportCsv() {
    this.exporting.set(true);
    const url = `${environment.apiUrl}/reports/${this.type()}/export?dateFrom=${this.dateFrom()}&dateTo=${this.dateTo()}`;
    this.http.get(url, { responseType: 'text' }).subscribe({
      next: (csv) => {
        this.download(`report-${this.type()}.csv`, csv, 'text/csv;charset=utf-8;');
        this.exporting.set(false);
      },
      error: (err) => {
        this.exporting.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private formatRows(result: ReportResult): Record<string, unknown>[] {
    const cols = result.columns ?? [];
    const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (result.rows ?? []).map((row) => {
      const out: Record<string, unknown> = {};
      for (const col of cols) {
        const value = row[col.key];
        if (typeof value === 'number') {
          out[col.key] = col.align === 'end' ? formatter.format(value) : value;
        } else if (value instanceof Date) {
          out[col.key] = value.toLocaleDateString();
        } else {
          out[col.key] = value;
        }
      }
      return out;
    });
  }

  private download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}