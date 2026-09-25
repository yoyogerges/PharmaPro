import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowRight, Printer, ReceiptText } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface SaleRow {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  customer: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  cashier: string;
}

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SALES.title' | translate)" [crumbs]="[('NAV.sales' | translate)]" />

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="sm:w-72" [placeholder]="('SALES.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.status" (ngModelChange)="onStatus($event)" class="form-input sm:w-44">
          <option value="">{{ 'COMMON.status' | translate }} · {{ 'COMMON.all' | translate }}</option>
          @for (status of saleStatuses; track status) {
            <option [value]="status">{{ 'ENUMS.' + status | translate }}</option>
          }
        </select>
        <select [ngModel]="query.paymentStatus" (ngModelChange)="onPaymentStatus($event)" class="form-input sm:w-44">
          <option value="">{{ 'SALES.payment_status' | translate }} · {{ 'COMMON.all' | translate }}</option>
          @for (status of paymentStatuses; track status) {
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
        [clickable]="true"
        (pageChange)="onPage($event)"
        (rowClick)="onRowClick($event)"
      />
    </div>
  `,
})
export class SalesListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly saleStatuses = ['COMPLETED', 'RETURNED', 'PARTIALLY_RETURNED', 'CANCELLED'];
  readonly paymentStatuses = ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED'];

  readonly columns: TableColumn<SaleRow>[] = [
    { key: 'invoiceNumber', label: 'SALES.invoice_number' },
    { key: 'saleDate', label: 'SALES.sale_date' },
    { key: 'customer', label: 'SALES.customer' },
    { key: 'itemCount', label: 'SALES.items', align: 'end' },
    { key: 'totalAmount', label: 'SALES.total_amount', align: 'end' },
    { key: 'status', label: 'SALES.status' },
    { key: 'paymentStatus', label: 'SALES.payment_status' },
    { key: 'cashier', label: 'SALES.cashier' },
  ];

  protected readonly query = { page: 1, limit: 10, status: '', paymentStatus: '', search: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<SaleRow[]>([]);

  protected readonly Printer = Printer;
  protected readonly ReceiptText = ReceiptText;
  protected readonly ArrowRight = ArrowRight;

  ngOnInit() {
    this.load();
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

  onPaymentStatus(value: string) {
    this.query.paymentStatus = value;
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

  onRowClick(row: SaleRow) {
    this.router.navigate(['/sales', row.id]);
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/sales', {
        page: this.query.page,
        limit: this.query.limit,
        status: this.query.status,
        paymentStatus: this.query.paymentStatus,
        search: this.query.search,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              invoiceNumber: item.invoiceNumber,
              saleDate: new Date(item.saleDate).toLocaleDateString(),
              customer: item.customer?.name ?? '—',
              itemCount: item.itemCount,
              totalAmount: Number(item.totalAmount),
              status: item.status,
              paymentStatus: item.paymentStatus,
              cashier: item.cashier ? [item.cashier.firstName, item.cashier.lastName].filter(Boolean).join(' ') : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}