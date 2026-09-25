import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, CheckCircle2, Plus, SlidersHorizontal, X, XCircle } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface AdjustmentRow {
  id: string;
  date: string;
  product: string;
  batch: string;
  type: string;
  quantity: number;
  reason: string;
  status: string;
  adjustedBy: string;
  approvedBy: string;
}

@Component({
  selector: 'app-adjustments',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('INVENTORY.adjustments_title' | translate)" [crumbs]="[('NAV.inventory' | translate), ('NAV.adjustments' | translate)]">
        @if (canAdjust()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'INVENTORY.new_adjustment' | translate }}
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('INVENTORY.product' | translate)" [required]="true" [control]="form.controls.productId">
              <app-select-search
                [options]="productOptions()"
                formControlName="productId"
              />
            </app-form-field>
            <app-form-field [label]="('INVENTORY.batch' | translate)" [control]="form.controls.batchId">
              <app-select-search
                [options]="batchOptions()"
                [emptyLabel]="('INVENTORY.product_level' | translate)"
                formControlName="batchId"
              />
            </app-form-field>
            <app-form-field [label]="('INVENTORY.adjust_direction' | translate)" [required]="true" [control]="form.controls.type">
              <div class="flex gap-2">
                <button type="button" (click)="setDirection('ADJUSTMENT_IN')" class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition"
                  [class.border-emerald-400 bg-emerald-50 text-emerald-700]="form.controls.type.value === 'ADJUSTMENT_IN'"
                  [class.border-slate-300 text-slate-500]="form.controls.type.value !== 'ADJUSTMENT_IN'">
                  {{ 'INVENTORY.direction_in' | translate }}
                </button>
                <button type="button" (click)="setDirection('ADJUSTMENT_OUT')" class="flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition"
                  [class.border-red-400 bg-red-50 text-red-700]="form.controls.type.value === 'ADJUSTMENT_OUT'"
                  [class.border-slate-300 text-slate-500]="form.controls.type.value !== 'ADJUSTMENT_OUT'">
                  {{ 'INVENTORY.direction_out' | translate }}
                </button>
              </div>
            </app-form-field>
            <app-form-field [label]="('INVENTORY.adjustment_quantity' | translate)" [required]="true" [control]="form.controls.quantity">
              <input type="number" step="1" min="1" formControlName="quantity" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('INVENTORY.reason' | translate)" [required]="true" [control]="form.controls.reason">
              <input type="text" formControlName="reason" class="form-input" />
            </app-form-field>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" (click)="closeForm()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button type="submit" [disabled]="form.invalid" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ 'COMMON.create' | translate }}
            </button>
          </div>
        </form>
      }

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:w-48">
          <select
            [ngModel]="query.status"
            (ngModelChange)="onStatus($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{{ 'COMMON.all' | translate }}</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
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
        [hasActions]="canApprove()"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
      >
        <ng-template #actionsTpl let-row>
          @if (row.status === 'PENDING' && canApprove()) {
            <div class="flex items-center justify-end gap-1">
              <button type="button" (click)="onApprove($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30" [title]="('INVENTORY.approve' | translate)">
                <lucide-angular [img]="CheckCircle2" class="h-4 w-4"></lucide-angular>
              </button>
              <button type="button" (click)="onReject($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" [title]="('INVENTORY.reject' | translate)">
                <lucide-angular [img]="XCircle" class="h-4 w-4"></lucide-angular>
              </button>
            </div>
          }
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class AdjustmentsComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<AdjustmentRow>[] = [
    { key: 'date', label: 'COMMON.date' },
    { key: 'product', label: 'INVENTORY.product' },
    { key: 'batch', label: 'INVENTORY.batch' },
    { key: 'type', label: 'INVENTORY.adjust_direction' },
    { key: 'quantity', label: 'COMMON.quantity', align: 'end' },
    { key: 'reason', label: 'INVENTORY.reason' },
    { key: 'status', label: 'COMMON.status' },
    { key: 'adjustedBy', label: 'INVENTORY.adjusted_by' },
    { key: 'approvedBy', label: 'INVENTORY.approved_by' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    status: '',
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<AdjustmentRow[]>([]);
  readonly formOpen = signal(false);
  readonly productOptions = signal<SelectOption[]>([]);
  readonly batchOptions = signal<SelectOption[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    batchId: [''],
    type: ['ADJUSTMENT_IN', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    reason: ['', Validators.required],
  });

  protected readonly Plus = Plus;
  protected readonly X = X;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly XCircle = XCircle;
  protected readonly SlidersHorizontal = SlidersHorizontal;

  ngOnInit() {
    this.load();
    this.loadProducts();
    this.form.controls.productId.valueChanges.subscribe(() => this.onProductChange());
  }

  canAdjust() {
    return this.authService.hasPermission('inventory.adjust');
  }
  canApprove() {
    return this.authService.hasPermission('inventory.approve_adjustment');
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

  setDirection(type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT') {
    this.form.controls.type.setValue(type);
  }

  onProductChange() {
    this.batchOptions.set([]);
    this.form.controls.batchId.setValue('');
    const productId = this.form.controls.productId.value;
    if (!productId) return;
    this.api.get<any[]>(`/batches/product/${productId}`).subscribe({
      next: (list) =>
        this.batchOptions.set(list.map((b) => ({ value: b.id, label: `${b.batchNumber} (${b.remainingQuantity} left)` }))),
      error: () => undefined,
    });
  }

  openForm() {
    this.form.reset({ productId: '', batchId: '', type: 'ADJUSTMENT_IN', quantity: 1, reason: '' });
    this.batchOptions.set([]);
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onApprove(event: MouseEvent, row: AdjustmentRow) {
    event.stopPropagation();
    const confirmed = window.confirm(`Approve ${row.type} ${row.quantity} x ${row.product}?`);
    if (!confirmed) return;
    this.api.patch(`/inventory/adjustments/${row.id}/approve`).subscribe({
      next: () => {
        this.notifications.success('INVENTORY.approved_success');
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  onReject(event: MouseEvent, row: AdjustmentRow) {
    event.stopPropagation();
    const confirmed = window.confirm(`Reject ${row.type} ${row.quantity} x ${row.product}?`);
    if (!confirmed) return;
    this.api.patch(`/inventory/adjustments/${row.id}/reject`).subscribe({
      next: () => {
        this.notifications.success('INVENTORY.rejected_success');
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload = {
      productId: raw.productId,
      batchId: raw.batchId || undefined,
      type: raw.type,
      quantity: Number(raw.quantity),
      reason: raw.reason.trim(),
    };
    this.api.post('/inventory/adjustments', payload).subscribe({
      next: () => {
        this.notifications.success('INVENTORY.create_success');
        this.closeForm();
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<AdjustmentRow>>('/inventory/adjustments', {
        page: this.query.page,
        limit: this.query.limit,
        status: this.query.status,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              date: this.formatDateTime(item.createdAt),
              product: item.product?.name ?? item.productId,
              batch: item.batch?.batchNumber ?? '',
              type: item.type,
              quantity: item.quantity,
              reason: item.reason,
              status: item.status,
              adjustedBy: [item.adjustedBy?.firstName, item.adjustedBy?.lastName].filter(Boolean).join(' ') || '—',
              approvedBy: [item.approvedBy?.firstName, item.approvedBy?.lastName].filter(Boolean).join(' ') || '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadProducts() {
    this.api.get<PaginatedData<any>>('/products', { page: 1, limit: 500, isActive: true }).subscribe({
      next: (res) => {
        this.productOptions.set(res.items.map((p) => ({ value: p.id, label: p.name })));
      },
      error: () => undefined,
    });
  }

  private formatDateTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
}