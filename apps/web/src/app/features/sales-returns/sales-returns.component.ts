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

interface ReturnRow {
  id: string;
  returnNumber: string;
  invoiceNumber: string;
  returnDate: string;
  customer: string;
  itemCount: number;
  totalAmount: number;
  refundMethod: string;
  status: string;
  returnedBy: string;
}

@Component({
  selector: 'app-sales-returns',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SALES_RETURNS.title' | translate)" [crumbs]="[('NAV.sales_returns' | translate)]">
        @if (canReturn()) {
          <button
            type="button"
            (click)="router.navigate(['/sales-returns/new'])"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'SALES_RETURNS.create' | translate }}
          </button>
        }
      </app-page-header>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="sm:w-72" [placeholder]="('SALES_RETURNS.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.status" (ngModelChange)="onStatus($event)" class="form-input sm:w-44">
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
        [hasActions]="false"
        (pageChange)="onPage($event)"
      />
    </div>
  `,
})
export class SalesReturnsComponent {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly statuses = ['COMPLETED', 'CANCELLED'];

  readonly columns: TableColumn<ReturnRow>[] = [
    { key: 'returnNumber', label: 'SALES_RETURNS.return_number' },
    { key: 'invoiceNumber', label: 'SALES_RETURNS.sale_number' },
    { key: 'returnDate', label: 'SALES_RETURNS.return_date' },
    { key: 'customer', label: 'SALES_RETURNS.customer' },
    { key: 'itemCount', label: 'SALES_RETURNS.item_count', align: 'end' },
    { key: 'totalAmount', label: 'SALES_RETURNS.total_amount', align: 'end' },
    { key: 'refundMethod', label: 'SALES_RETURNS.refund_method' },
    { key: 'status', label: 'SALES_RETURNS.status' },
    { key: 'returnedBy', label: 'SALES_RETURNS.returned_by' },
  ];

  protected readonly query = { page: 1, limit: 10, status: '', search: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<ReturnRow[]>([]);

  protected readonly Plus = Plus;

  ngOnInit() {
    this.load();
  }

  canReturn() {
    return this.authService.hasPermission('sales.return');
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

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/sales-returns', {
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
              returnNumber: item.returnNumber,
              invoiceNumber: item.sale?.invoiceNumber ?? '—',
              returnDate: new Date(item.returnDate).toLocaleDateString(),
              customer: item.customer?.name ?? '—',
              itemCount: item.itemCount,
              totalAmount: Number(item.totalAmount),
              refundMethod: item.refundMethod ?? '—',
              status: item.status,
              returnedBy: item.returnedBy ? [item.returnedBy.firstName, item.returnedBy.lastName].filter(Boolean).join(' ') : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}