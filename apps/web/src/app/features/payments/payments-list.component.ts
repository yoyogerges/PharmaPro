import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Plus } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface PaymentRow {
  id: string;
  paymentNumber: string;
  date: string;
  type: string;
  entity: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  user: string;
}

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header [title]="('PAYMENTS.title' | translate)" [crumbs]="[('NAV.payments' | translate)]" />
        @if (canCreate()) {
          <button
            type="button"
            (click)="router.navigate(['/payments/new'])"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'PAYMENTS.new_payment' | translate }}
          </button>
        }
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="sm:w-72" [placeholder]="('PAYMENTS.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.type" (ngModelChange)="onType($event)" class="form-input sm:w-48">
          <option value="">{{ 'PAYMENTS.type' | translate }} · {{ 'COMMON.all' | translate }}</option>
          @for (type of types; track type) {
            <option [value]="type">{{ 'ENUMS.' + type | translate }}</option>
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
        [hasActions]="false"
        [rowTemplate]="actionsTpl"
      >
        <ng-template #actionsTpl let-row></ng-template>
      </app-data-table>
    </div>
  `,
})
export class PaymentsListComponent {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly types = ['CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE_PAYMENT'];

  readonly columns: TableColumn<PaymentRow>[] = [
    { key: 'paymentNumber', label: 'PAYMENTS.number' },
    { key: 'date', label: 'COMMON.date' },
    { key: 'type', label: 'PAYMENTS.type' },
    { key: 'entity', label: 'PAYMENTS.entity' },
    { key: 'amount', label: 'PAYMENTS.amount', align: 'end' },
    { key: 'paymentMethod', label: 'PAYMENTS.method' },
    { key: 'reference', label: 'PAYMENTS.reference' },
    { key: 'user', label: 'PAYMENTS.user' },
  ];

  protected readonly query = { page: 1, limit: 10, type: '', search: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<PaymentRow[]>([]);

  protected readonly Plus = Plus;

  ngOnInit() {
    this.load();
  }

  canCreate(): boolean {
    return this.authService.hasPermission('payments.create');
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onType(value: string) {
    this.query.type = value;
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

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/payments', {
        page: this.query.page,
        limit: this.query.limit,
        type: this.query.type,
        search: this.query.search,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => {
              let entity = '—';
              if (item.customer) entity = item.customer.name;
              else if (item.supplier) entity = item.supplier.name;
              else if (item.expense) entity = item.expense.description ?? '—';
              return {
                id: item.id,
                paymentNumber: item.paymentNumber,
                date: new Date(item.paymentDate).toLocaleDateString(),
                type: item.type,
                entity,
                amount: item.amount,
                paymentMethod: item.paymentMethod,
                reference: item.reference ?? '—',
                user: item.user ? [item.user.firstName, item.user.lastName].filter(Boolean).join(' ') : '—',
              };
            }),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}