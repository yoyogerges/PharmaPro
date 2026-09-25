import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeftRight } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';

interface MovementRow {
  id: string;
  date: string;
  type: string;
  product: string;
  batch: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  user: string;
  reference: string;
}

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('INVENTORY.movements_title' | translate)" [crumbs]="[('NAV.inventory' | translate), ('NAV.movements' | translate)]" />

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:w-48">
          <select
            [ngModel]="query.type"
            (ngModelChange)="onType($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{{ 'INVENTORY.movement_type' | translate }}</option>
            @for (type of movementTypes; track type) {
              <option [value]="type">{{ type }}</option>
            }
          </select>
        </div>
        <div class="w-full sm:w-44">
          <input type="date" [ngModel]="query.dateFrom" (ngModelChange)="onDate('from', $event)" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
        <div class="w-full sm:w-44">
          <input type="date" [ngModel]="query.dateTo" (ngModelChange)="onDate('to', $event)" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
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
export class MovementsComponent {
  private readonly api = inject(ApiService);

  readonly movementTypes = [
    'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN',
    'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'EXPIRED_WRITE_OFF',
  ];

  readonly columns: TableColumn<MovementRow>[] = [
    { key: 'date', label: 'COMMON.date' },
    { key: 'type', label: 'INVENTORY.movement_type' },
    { key: 'product', label: 'INVENTORY.product' },
    { key: 'batch', label: 'INVENTORY.batch' },
    { key: 'quantity', label: 'COMMON.quantity', align: 'end' },
    { key: 'beforeQuantity', label: 'INVENTORY.before', align: 'end' },
    { key: 'afterQuantity', label: 'INVENTORY.after', align: 'end' },
    { key: 'user', label: 'INVENTORY.user' },
    { key: 'reference', label: 'INVENTORY.reference' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    type: '',
    dateFrom: '',
    dateTo: '',
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<MovementRow[]>([]);

  protected readonly ArrowLeftRight = ArrowLeftRight;

  ngOnInit() {
    this.load();
  }

  onType(value: string) {
    this.query.type = value;
    this.query.page = 1;
    this.load();
  }

  onDate(which: 'from' | 'to', value: string) {
    if (which === 'from') this.query.dateFrom = value;
    else this.query.dateTo = value;
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
      .get<PaginatedData<MovementRow>>('/inventory/movements', {
        page: this.query.page,
        limit: this.query.limit,
        type: this.query.type,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              date: this.formatDateTime(item.createdAt),
              type: item.type,
              product: item.product?.name ?? item.productId,
              batch: item.batch?.batchNumber ?? '',
              quantity: item.quantity,
              beforeQuantity: item.beforeQuantity,
              afterQuantity: item.afterQuantity,
              user: [item.user?.firstName, item.user?.lastName].filter(Boolean).join(' ') || '—',
              reference: item.referenceType ? `${item.referenceType}` : '',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private formatDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}