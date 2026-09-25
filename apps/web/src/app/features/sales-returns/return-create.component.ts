import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, RotateCcw } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface ReturnLine {
  saleItemId: string;
  productName: string;
  batchId: string;
  unitPrice: number;
  quantity: number;
  reason: string;
  batchOptions: { value: string; label: string }[];
}

interface SaleOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-return-create',
  standalone: true,
  imports: [FormsModule, DecimalPipe, RouterLink, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SALES_RETURNS.new_title' | translate)" [crumbs]="[('NAV.sales_returns' | translate), ('SALES_RETURNS.new_title' | translate)]" />

      @if (!saleIdParam) {
        <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES_RETURNS.select_sale' | translate }}</label>
          <select [ngModel]="selectedSaleId" (ngModelChange)="onPickSale($event)" class="form-input">
            <option value="">{{ 'COMMON.select' | translate }}</option>
            @for (option of saleOptions(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      }

      @if (loading()) {
        <div class="flex h-40 items-center justify-center">
          <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
        </div>
      } @else if (!sale()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p class="text-sm text-slate-500">{{ 'SALES_RETURNS.sale_not_found' | translate }}</p>
        </div>
      } @else {
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-xs text-slate-500">{{ 'SALES_RETURNS.sale_number' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.invoiceNumber }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'SALES.date' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatDate(sale()!.saleDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'SALES.customer' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.customer?.name ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'SALES.total_amount' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-bold text-primary-600 dark:text-primary-400">{{ sale()!.totalAmount }}</dd>
            </div>
          </dl>
        </div>

        <form (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('SALES_RETURNS.refund_method' | translate)">
              <select [(ngModel)]="refundMethod" name="refundMethod" class="form-input">
                @for (method of methods; track method) {
                  <option [value]="method">{{ 'ENUMS.' + method | translate }}</option>
                }
              </select>
            </app-form-field>
            <app-form-field [label]="('SALES_RETURNS.reason' | translate)">
              <input type="text" [(ngModel)]="reason" name="reason" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SALES_RETURNS.notes' | translate)">
              <input type="text" [(ngModel)]="notes" name="notes" class="form-input" />
            </app-form-field>
          </div>

          <div class="mt-5 space-y-3">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ 'SALES_RETURNS.items_title' | translate }}</h2>
            @for (line of lines(); track line.saleItemId; let i = $index) {
              <div class="grid gap-3 rounded-xl border border-slate-300 bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-700 dark:bg-slate-900">
                <div class="lg:col-span-4">
                  <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES.product' | translate }}</label>
                  <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ line.productName }}</p>
                </div>
                <div class="lg:col-span-3">
                  <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES_RETURNS.batch' | translate }}</label>
                  <select [ngModel]="line.batchId" (ngModelChange)="onBatchChange(i, $event)" [ngModelOptions]="{ standalone: true }" class="form-input">
                    @for (option of line.batchOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </div>
                <div class="lg:col-span-2">
                  <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES_RETURNS.quantity' | translate }}</label>
                  <input [ngModel]="line.quantity" (ngModelChange)="onQuantityChange(i, $event)" [ngModelOptions]="{ standalone: true }" type="number" min="1" class="form-input" />
                </div>
                <div class="lg:col-span-2">
                  <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES_RETURNS.line_total' | translate }}</label>
                  <p class="pt-1.5 text-sm font-bold text-slate-800 dark:text-slate-100">{{ line.quantity * line.unitPrice | number: '1.2-2' }}</p>
                </div>
                <div class="lg:col-span-1">
                  <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'SALES_RETURNS.reason' | translate }}</label>
                  <input [ngModel]="line.reason" (ngModelChange)="onReasonChange(i, $event)" [ngModelOptions]="{ standalone: true }" type="text" class="form-input" />
                </div>
              </div>
            }
          </div>

          <div class="mt-4 flex items-center justify-between">
            <p class="text-sm text-slate-500">{{ 'SALES_RETURNS.return_hint' | translate }}</p>
            <div class="flex items-center gap-2">
              <a routerLink="/sales-returns" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                {{ 'COMMON.cancel' | translate }}
              </a>
              <button
                type="submit"
                [disabled]="saving() || lines().length === 0"
                class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
              >
                <lucide-angular [img]="RotateCcw" class="h-4 w-4"></lucide-angular>
                {{ saving() ? '…' : ('SALES_RETURNS.submit' | translate) }}
              </button>
            </div>
          </div>
        </form>

        <a routerLink="/sales-returns" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600">
          <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
          {{ 'SALES_RETURNS.back' | translate }}
        </a>
      }
    </div>
  `,
})
export class ReturnCreateComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly saleIdParam = this.route.snapshot.paramMap.get('saleId');

  readonly methods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'];

  readonly sale = signal<any | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly lines = signal<ReturnLine[]>([]);
  readonly saleOptions = signal<SaleOption[]>([]);

  selectedSaleId = '';
  refundMethod = 'CASH';
  reason = '';
  notes = '';

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly RotateCcw = RotateCcw;

  ngOnInit() {
    if (this.saleIdParam) {
      this.loadSale(this.saleIdParam);
    } else {
      this.loading.set(false);
      this.loadSaleOptions();
    }
  }

  private loadSale(id: string) {
    this.loading.set(true);
    this.api.get<any>(`/sales/${id}`).subscribe({
      next: (sale) => {
        this.sale.set(sale);
        this.buildLines(sale);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private buildLines(sale: any) {
    this.lines.set(
      (sale.items ?? []).map((item: any) => ({
        saleItemId: item.id,
        productName: item.product?.name ?? '—',
        batchId: item.batch?.id ?? '',
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        reason: '',
        batchOptions: [{ value: '', label: this.translate.instant('SALES_RETURNS.auto_batch') }],
      })),
    );
    for (const item of sale.items ?? []) {
      this.loadBatches(item);
    }
  }

  private loadBatches(item: any) {
    this.api.get<any[]>(`/batches/product/${item.productId}`).subscribe({
      next: (list) => {
        this.lines.update((current) =>
          current.map((line) => {
            if (line.saleItemId !== item.id) return line;
            const options = [{ value: '', label: this.translate.instant('SALES_RETURNS.auto_batch') }];
            for (const batch of list) {
              options.push({ value: batch.id, label: `${batch.batchNumber} (${batch.remainingQuantity} left)` });
            }
            return { ...line, batchOptions: options };
          }),
        );
      },
      error: () => undefined,
    });
  }

  private loadSaleOptions() {
    this.api.get<PaginatedData<any>>('/sales', { page: 1, limit: 100 }).subscribe({
      next: (res) =>
        this.saleOptions.set(
          res.items.map((sale: any) => ({ value: sale.id, label: `${sale.invoiceNumber} · ${new Date(sale.saleDate).toLocaleDateString()} · ${sale.customer?.name ?? '—'} · ${sale.totalAmount}` })),
        ),
      error: () => undefined,
    });
  }

  onPickSale(id: string) {
    this.selectedSaleId = id;
    this.sale.set(null);
    this.lines.set([]);
    if (id) this.loadSale(id);
  }

  onBatchChange(i: number, value: string) {
    this.lines.update((current) => current.map((line, idx) => (idx === i ? { ...line, batchId: value } : line)));
  }

  onQuantityChange(i: number, value: string) {
    const parsed = Math.max(1, Math.floor(Number(value) || 1));
    this.lines.update((current) => current.map((line, idx) => (idx === i ? { ...line, quantity: parsed } : line)));
  }

  onReasonChange(i: number, value: string) {
    this.lines.update((current) => current.map((line, idx) => (idx === i ? { ...line, reason: value } : line)));
  }

  submit() {
    if (this.lines().length === 0) return;
    const payload = {
      saleId: this.sale()!.id,
      refundMethod: this.refundMethod,
      reason: this.reason.trim() || undefined,
      notes: this.notes.trim() || undefined,
      items: this.lines().map((line) => ({
        saleItemId: line.saleItemId,
        batchId: line.batchId || undefined,
        quantity: line.quantity,
        reason: line.reason.trim() || undefined,
      })),
    };
    this.saving.set(true);
    this.api.post('/sales-returns', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('SALES_RETURNS.created_success');
        this.router.navigate(['/sales-returns']);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }
}