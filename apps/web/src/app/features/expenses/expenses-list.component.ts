import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Plus, Check, X as XMark } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface ExpenseRow {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: string;
  status: string;
  createdBy: string;
}

@Component({
  selector: 'app-expenses-list',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header [title]="('EXPENSES.title' | translate)" [crumbs]="[('NAV.expenses' | translate)]" />
        <div class="flex items-center gap-2">
          @if (canManage()) {
            <button
              type="button"
              (click)="router.navigate(['/expense-categories'])"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              {{ 'EXPENSES.categories' | translate }}
            </button>
          }
          @if (canCreate()) {
            <button
              type="button"
              (click)="router.navigate(['/expenses/new'])"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
              {{ 'EXPENSES.new_expense' | translate }}
            </button>
          }
        </div>
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="sm:w-72" [placeholder]="('EXPENSES.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.status" (ngModelChange)="onStatus($event)" class="form-input sm:w-48">
          <option value="">{{ 'COMMON.status' | translate }} · {{ 'COMMON.all' | translate }}</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ 'ENUMS.' + status | translate }}</option>
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
      >
        <ng-template #actionsTpl let-row>
          @if (row.status === 'PENDING' && canApprove()) {
            <div class="inline-flex items-center gap-1.5">
              <button
                type="button"
                [disabled]="busyId() === row.id"
                (click)="approve(row)"
                class="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/30 dark:text-emerald-300"
              >
                <lucide-angular [img]="Check" class="h-3.5 w-3.5"></lucide-angular>
                {{ 'EXPENSES.approve' | translate }}
              </button>
              <button
                type="button"
                [disabled]="busyId() === row.id"
                (click)="reject(row)"
                class="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400"
              >
                <lucide-angular [img]="XMark" class="h-3.5 w-3.5"></lucide-angular>
                {{ 'EXPENSES.reject' | translate }}
              </button>
            </div>
          }
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class ExpensesListComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly statuses = ['PENDING', 'APPROVED', 'REJECTED'];

  readonly columns: TableColumn<ExpenseRow>[] = [
    { key: 'date', label: 'COMMON.date' },
    { key: 'description', label: 'EXPENSES.description' },
    { key: 'category', label: 'EXPENSES.category' },
    { key: 'amount', label: 'EXPENSES.amount', align: 'end' },
    { key: 'paymentMethod', label: 'EXPENSES.payment_method' },
    { key: 'status', label: 'COMMON.status' },
    { key: 'createdBy', label: 'EXPENSES.created_by' },
  ];

  protected readonly query = { page: 1, limit: 10, status: '', search: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly busyId = signal('');
  readonly rows = signal<ExpenseRow[]>([]);

  protected readonly Plus = Plus;
  protected readonly Check = Check;
  protected readonly XMark = XMark;

  ngOnInit() {
    this.load();
  }

  canCreate(): boolean {
    return this.authService.hasPermission('expenses.create');
  }

  canManage(): boolean {
    return this.authService.hasPermission('expenses.update');
  }

  canApprove(): boolean {
    return this.authService.hasPermission('expenses.approve');
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onStatus(value: string) {
    this.query.status = value;
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

  approve(row: ExpenseRow) {
    this.busyId.set(row.id);
    this.api.post(`/expenses/${row.id}/approve`).subscribe({
      next: () => {
        this.busyId.set('');
        this.notifications.success('EXPENSES.approved_success');
        this.load();
      },
      error: (err) => {
        this.busyId.set('');
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  reject(row: ExpenseRow) {
    this.busyId.set(row.id);
    this.api.post(`/expenses/${row.id}/reject`).subscribe({
      next: () => {
        this.busyId.set('');
        this.notifications.success('EXPENSES.rejected_success');
        this.load();
      },
      error: (err) => {
        this.busyId.set('');
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/expenses', {
        page: this.query.page,
        limit: this.query.limit,
        status: this.query.status,
        search: this.query.search,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              date: new Date(item.date).toLocaleDateString(),
              description: item.description ?? '—',
              category: item.category?.name ?? '—',
              amount: item.amount,
              paymentMethod: item.paymentMethod,
              status: item.status,
              createdBy: item.createdBy ? [item.createdBy.firstName, item.createdBy.lastName].filter(Boolean).join(' ') : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}