import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Boxes } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';

interface BatchRow {
  id: string;
  batchNumber: string;
  productName: string;
  expiryDate: string;
  daysToExpiry: number;
  status: string;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  supplierName: string;
}

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('BATCHES.title' | translate)" [crumbs]="[('NAV.batches' | translate)]" />

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:max-w-xs">
          <app-search-input [placeholder]="('BATCHES.batch_number' | translate)" (changed)="onSearch($event)" />
        </div>
        <div class="w-full sm:w-48">
          <select
            [ngModel]="query.status"
            (ngModelChange)="onStatus($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{{ 'COMMON.all' | translate }}</option>
            <option value="ACTIVE">{{ 'COMMON.active' | translate }}</option>
            <option value="EXPIRED">{{ 'ENUMS.EXPIRED' | translate }}</option>
          </select>
        </div>
      </div>

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="query.page"
        [limit]="query.limit"
        [total]="total()"
        [clickable]="true"
        [hasActions]="false"
        (pageChange)="onPage($event)"
        (rowClick)="onRowClick($event)"
      />
    </div>
  `,
})
export class BatchesComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly columns: TableColumn<BatchRow>[] = [
    { key: 'batchNumber', label: 'BATCHES.batch_number', sortable: true },
    { key: 'productName', label: 'BATCHES.product' },
    { key: 'expiryDate', label: 'BATCHES.expiry_date' },
    { key: 'status', label: 'BATCHES.status' },
    { key: 'remainingQuantity', label: 'BATCHES.remaining', align: 'end' },
    { key: 'purchasePrice', label: 'BATCHES.purchase_price', align: 'end' },
    { key: 'sellingPrice', label: 'BATCHES.selling_price', align: 'end' },
    { key: 'supplierName', label: 'BATCHES.supplier' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    search: '',
    status: '',
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<BatchRow[]>([]);

  protected readonly Boxes = Boxes;

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

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  onRowClick(row: BatchRow) {
    this.router.navigate(['/batches', row.id]);
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<BatchRow>>('/batches', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
        status: this.query.status,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              batchNumber: item.batchNumber,
              productName: item.product?.name ?? item.productId,
              expiryDate: new Date(item.expiryDate).toLocaleDateString(),
              daysToExpiry: item.daysToExpiry,
              status: item.status,
              quantity: item.quantity,
              remainingQuantity: item.remainingQuantity,
              purchasePrice: Number(item.purchasePrice ?? 0),
              sellingPrice: Number(item.sellingPrice ?? 0),
              supplierName: item.supplier?.name ?? '',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}