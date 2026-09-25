import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Eye, History } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface AuditRow {
  id: string;
  time: string;
  action: string;
  entityType: string;
  entityId: string;
  user: string;
  ipAddress: string;
  previousValue: unknown;
  newValue: unknown;
}

const ENTITY_TYPES = ['User', 'Product', 'Category', 'Supplier', 'Customer', 'Sale', 'PurchaseOrder', 'Inventory', 'Expense', 'Payment', 'Document', 'Role', 'Notification'];

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('AUDIT_LOG.title' | translate)" [crumbs]="[('NAV.audit_log' | translate)]" [subtitle]="('AUDIT_LOG.description' | translate)" />

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="lg:w-72" [placeholder]="('AUDIT_LOG.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.entityType" (ngModelChange)="onEntityType($event)" class="form-input sm:w-48">
          <option value="">{{ 'AUDIT_LOG.all_types' | translate }}</option>
          @for (type of entityTypes; track type) {
            <option [value]="type">{{ type }}</option>
          }
        </select>
        <app-date-range-picker (changed)="onDateRange($event)" />
      </div>

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="query.page"
        [limit]="query.limit"
        [total]="total()"
        [hasActions]="true"
        [actionsLabel]="'COMMON.actions'"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
      >
        <ng-template #actionsTpl let-row>
          <button
            type="button"
            (click)="toggleDetails(row)"
            class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            <lucide-angular [img]="Eye" class="h-3.5 w-3.5"></lucide-angular>
            {{ 'AUDIT_LOG.details' | translate }}
          </button>
        </ng-template>
      </app-data-table>

      @if (selected()) {
        <section class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <lucide-angular [img]="History" class="h-4 w-4"></lucide-angular>
            {{ (selected()!.action) }} · {{ selected()!.entityType }} · {{ selected()!.id }}
          </h3>
          <div class="grid gap-4 lg:grid-cols-2">
            <div>
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ 'AUDIT_LOG.previous_value' | translate }}</p>
              @if (selectedJson('previous')) {
                <pre class="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ selectedJson('previous') }}</pre>
              } @else {
                <p class="text-sm text-slate-400">{{ 'AUDIT_LOG.no_changes' | translate }}</p>
              }
            </div>
            <div>
              <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ 'AUDIT_LOG.new_value' | translate }}</p>
              @if (selectedJson('new')) {
                <pre class="max-h-64 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{{ selectedJson('new') }}</pre>
              } @else {
                <p class="text-sm text-slate-400">{{ 'AUDIT_LOG.no_changes' | translate }}</p>
              }
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class AuditLogComponent {
  private readonly api = inject(ApiService);

  readonly entityTypes = ENTITY_TYPES;

  readonly columns: TableColumn<AuditRow>[] = [
    { key: 'time', label: 'AUDIT_LOG.time' },
    { key: 'action', label: 'AUDIT_LOG.action' },
    { key: 'entityType', label: 'AUDIT_LOG.entity' },
    { key: 'entityId', label: 'AUDIT_LOG.entity_id' },
    { key: 'user', label: 'AUDIT_LOG.user' },
    { key: 'ipAddress', label: 'AUDIT_LOG.ip_address' },
  ];

  protected readonly query = { page: 1, limit: 15, search: '', entityType: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<AuditRow[]>([]);
  readonly selected = signal<AuditRow | null>(null);

  protected readonly Eye = Eye;
  protected readonly History = History;

  ngOnInit() {
    this.load();
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onEntityType(value: string) {
    this.query.entityType = value;
    this.query.page = 1;
    this.load();
  }

  onDateRange(range: DateRange) {
    this.query.dateFrom = range.start;
    this.query.dateTo = range.end;
    this.query.page = 1;
    this.load();
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  toggleDetails(row: AuditRow) {
    this.selected.set(this.selected()?.id === row.id ? null : row);
  }

  selectedJson(which: 'previous' | 'new'): string | null {
    const value = which === 'previous' ? this.selected()?.previousValue : this.selected()?.newValue;
    if (value === null || value === undefined) return null;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/audit-log', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
        entityType: this.query.entityType,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              time: new Date(item.createdAt).toLocaleString(),
              action: item.action,
              entityType: item.entityType,
              entityId: item.entityId ?? '—',
              user: item.user ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') || item.user.username : '—',
              ipAddress: item.ipAddress ?? '—',
              previousValue: item.previousValue,
              newValue: item.newValue,
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}