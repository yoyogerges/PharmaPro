import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  supplier: string;
  receiptDate: string;
  itemCount: number;
  totalAmount: number;
  receivedBy: string;
  poNumber: string;
  purchaseOrderId: string | null;
}

@Component({
  selector: 'app-purchase-receipts',
  standalone: true,
  imports: [TranslatePipe, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('PURCHASES.receipts_title' | translate)" [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_receipts' | translate)]" />

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:max-w-xs">
          <app-search-input [placeholder]="('PURCHASES.search_placeholder' | translate)" (changed)="onSearch($event)" />
        </div>
      </div>

      <p class="text-xs text-slate-400">{{ 'PURCHASES.receipts_hint' | translate }}</p>

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
export class PurchaseReceiptsComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly columns: TableColumn<ReceiptRow>[] = [
    { key: 'receiptNumber', label: 'PURCHASES.receipt_number' },
    { key: 'supplier', label: 'PURCHASES.supplier' },
    { key: 'receiptDate', label: 'PURCHASES.receipt_date' },
    { key: 'poNumber', label: 'PURCHASES.po_number' },
    { key: 'itemCount', label: 'PURCHASES.item_count', align: 'end' },
    { key: 'totalAmount', label: 'PURCHASES.total_amount', align: 'end' },
    { key: 'receivedBy', label: 'PURCHASES.received_by' },
  ];

  protected readonly query = { page: 1, limit: 10, search: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<ReceiptRow[]>([]);

  ngOnInit() {
    this.load();
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  onRowClick(row: ReceiptRow) {
    if (row.purchaseOrderId) this.router.navigate(['/purchase-orders', row.purchaseOrderId]);
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/purchase-receipts', { page: this.query.page, limit: this.query.limit, search: this.query.search })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              receiptNumber: item.receiptNumber,
              supplier: item.supplier?.name ?? '—',
              receiptDate: new Date(item.receiptDate).toLocaleDateString(),
              itemCount: item.itemCount,
              totalAmount: Number(item.totalAmount),
              receivedBy: item.receivedBy ? [item.receivedBy.firstName, item.receivedBy.lastName].filter(Boolean).join(' ') : '—',
              poNumber: item.purchaseOrder?.poNumber ?? '—',
              purchaseOrderId: item.purchaseOrderId ?? null,
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}