import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, CalendarX } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';

interface ExpiryRow {
  id: string;
  batchNumber: string;
  productName: string;
  expiryDate: string;
  daysToExpiry: number;
  remainingQuantity: number;
  status: string;
}

@Component({
  selector: 'app-expiry',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('INVENTORY.expiry_title' | translate)" [crumbs]="[('NAV.inventory' | translate), ('NAV.expiry' | translate)]" />

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="setTab('expired')"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition"
          [class.bg-red-600 text-white]="tab() === 'expired'"
          [class.border border-slate-300 text-slate-600]="tab() !== 'expired'"
        >
          {{ 'INVENTORY.expired' | translate }}
        </button>
        <button
          type="button"
          (click)="setTab('near')"
          class="rounded-lg px-4 py-2 text-sm font-semibold transition"
          [class.bg-amber-500 text-white]="tab() === 'near'"
          [class.border border-slate-300 text-slate-600]="tab() !== 'near'"
        >
          {{ 'INVENTORY.near_expiry' | translate }}
        </button>
        @if (tab() === 'near') {
          @for (d of [30, 60, 90]; track d) {
            <button
              type="button"
              (click)="days.set(d); load()"
              class="rounded-lg px-3 py-2 text-sm font-semibold transition"
              [class.bg-primary-600 text-white]="days() === d"
              [class.border border-slate-300 text-slate-600]="days() !== d"
            >
              {{ d }} {{ 'INVENTORY.days' | translate }}
            </button>
          }
        }
      </div>

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="1"
        [limit]="50"
        [total]="rows().length"
        [hasActions]="false"
        [showPagination]="false"
      />
    </div>
  `,
})
export class ExpiryComponent {
  private readonly api = inject(ApiService);

  readonly columns: TableColumn<ExpiryRow>[] = [
    { key: 'batchNumber', label: 'BATCHES.batch_number' },
    { key: 'productName', label: 'INVENTORY.product' },
    { key: 'expiryDate', label: 'INVENTORY.expiry_date' },
    { key: 'daysToExpiry', label: 'INVENTORY.days_to_expiry', align: 'end' },
    { key: 'remainingQuantity', label: 'INVENTORY.remaining', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  readonly tab = signal<'expired' | 'near'>('expired');
  readonly days = signal(30);
  readonly loading = signal(true);
  readonly rows = signal<ExpiryRow[]>([]);

  protected readonly CalendarX = CalendarX;

  ngOnInit() {
    this.load();
  }

  setTab(tab: 'expired' | 'near') {
    this.tab.set(tab);
    this.load();
  }

  load() {
    this.loading.set(true);
    const endpoint =
      this.tab() === 'expired'
        ? '/batches/expiry/expired'
        : `/batches/expiry/near?days=${this.days()}`;
    this.api.get<any[]>(endpoint).subscribe({
      next: (items) => {
        this.rows.set(
          items.map((item) => ({
            id: item.batchId,
            batchNumber: item.batchNumber,
            productName: item.productName,
            expiryDate: new Date(item.expiryDate).toLocaleDateString(),
            daysToExpiry: item.daysToExpiry,
            remainingQuantity: item.remainingQuantity,
            status: item.status,
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}