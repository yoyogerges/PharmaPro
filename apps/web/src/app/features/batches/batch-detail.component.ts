import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Boxes } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';

interface MovementRow {
  id: string;
  date: string;
  type: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  user: string;
}

@Component({
  selector: 'app-batch-detail',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, RouterLink, PageHeaderComponent, DataTableComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/batches" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'BATCHES.back_to_batches' | translate }}
      </a>

      <app-page-header [title]="('BATCHES.detail' | translate)" [crumbs]="[('NAV.batches' | translate), batch()?.batchNumber ?? '']" />

      @if (batch()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.batch_number' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.batchNumber }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.product' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.product?.name ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.expiry_date' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(batch()!.expiryDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.status' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.status }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.quantity' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.quantity }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.remaining' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.remainingQuantity }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.purchase_price' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ money(batch()!.purchasePrice) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.selling_price' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ money(batch()!.sellingPrice) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.supplier' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ batch()!.supplier?.name ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'BATCHES.created_at' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatDateTime(batch()!.createdAt) }}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <lucide-angular [img]="Boxes" class="h-4 w-4 text-primary-500"></lucide-angular>
            {{ 'BATCHES.movements' | translate }}
          </h2>
          <app-data-table
            [columns]="movementColumns"
            [rows]="movements()"
            [loading]="loadingMovements()"
            [page]="1"
            [limit]="50"
            [total]="movements().length"
            [hasActions]="false"
            [showPagination]="false"
          />
        </div>
      } @else {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">
          {{ 'BATCHES.not_found' | translate }}
        </div>
      }
    </div>
  `,
})
export class BatchDetailComponent {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly movementColumns: TableColumn<MovementRow>[] = [
    { key: 'date', label: 'COMMON.date' },
    { key: 'type', label: 'INVENTORY.movement_type' },
    { key: 'quantity', label: 'COMMON.quantity', align: 'end' },
    { key: 'beforeQuantity', label: 'INVENTORY.before', align: 'end' },
    { key: 'afterQuantity', label: 'INVENTORY.after', align: 'end' },
    { key: 'user', label: 'INVENTORY.user' },
  ];

  readonly batch = signal<any | null>(null);
  readonly movements = signal<MovementRow[]>([]);
  readonly loadingMovements = signal(true);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Boxes = Boxes;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.api.get<any>(`/batches/${id}`).subscribe({
      next: (b) => {
        this.batch.set(b);
        this.loadMovements(id);
      },
      error: () => undefined,
    });
  }

  money(value: number): string {
    return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString();
  }

  formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
  }

  private loadMovements(batchId: string) {
    this.loadingMovements.set(true);
    this.api.get<any>('/inventory/movements', { batchId, limit: 50 }).subscribe({
      next: (res) => {
        this.movements.set(
          res.items.map((item: any) => ({
            id: item.id,
            date: new Date(item.createdAt).toLocaleString(),
            type: item.type,
            quantity: item.quantity,
            beforeQuantity: item.beforeQuantity,
            afterQuantity: item.afterQuantity,
            user: [item.user?.firstName, item.user?.lastName].filter(Boolean).join(' ') || '—',
          })),
        );
        this.loadingMovements.set(false);
      },
      error: () => this.loadingMovements.set(false),
    });
  }
}