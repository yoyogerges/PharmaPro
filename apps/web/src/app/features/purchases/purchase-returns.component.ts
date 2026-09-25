import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Plus, Trash2 } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface ReturnRow {
  id: string;
  returnNumber: string;
  supplier: string;
  returnDate: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  returnedBy: string;
}

interface ReturnItemGroup {
  productId: FormControl<string>;
  batchId: FormControl<string>;
  quantity: FormControl<number>;
  unitPrice: FormControl<number>;
  reason: FormControl<string>;
}

type ReturnItemFormGroup = FormGroup<ReturnItemGroup>;

@Component({
  selector: 'app-purchase-returns',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('PURCHASES.returns_title' | translate)" [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_returns' | translate)]">
        @if (canReturn()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'PURCHASES.create_return' | translate }}
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('PURCHASES.supplier' | translate)" [required]="true" [control]="form.controls.supplierId">
              <app-select-search [options]="supplierOptions()" formControlName="supplierId" />
            </app-form-field>
            <app-form-field [label]="('PURCHASES.receipt_number' | translate)" [control]="form.controls.purchaseReceiptId">
              <app-select-search [options]="receiptOptions()" formControlName="purchaseReceiptId" />
            </app-form-field>
            <app-form-field [label]="('PURCHASES.reason' | translate)" [control]="form.controls.reason">
              <input type="text" formControlName="reason" class="form-input" />
            </app-form-field>
          </div>

          <div class="mt-5 space-y-3">
            @for (group of itemGroups(); track $index) {
              <div [formGroup]="group" class="grid gap-3 rounded-xl border border-slate-300 bg-white p-3 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-700 dark:bg-slate-900">
                <div class="lg:col-span-3">
                  <app-form-field [label]="('PURCHASES.product' | translate)" [required]="true" [control]="group.controls.productId">
                    <app-select-search [options]="productOptions()" formControlName="productId" />
                  </app-form-field>
                </div>
                <div class="lg:col-span-3">
                  <app-form-field [label]="('PURCHASES.batch_number' | translate)" [control]="group.controls.batchId">
                    <app-select-search [options]="batchOptionsFor($index)" [emptyLabel]="('PURCHASES.auto_batch' | translate)" formControlName="batchId" />
                  </app-form-field>
                </div>
                <app-form-field [label]="('PURCHASES.quantity' | translate)" [required]="true" [control]="group.controls.quantity">
                  <input type="number" min="1" formControlName="quantity" class="form-input" />
                </app-form-field>
                <app-form-field [label]="('PURCHASES.unit_price' | translate)" [required]="true" [control]="group.controls.unitPrice">
                  <input type="number" min="0" step="0.01" formControlName="unitPrice" class="form-input" />
                </app-form-field>
                <div class="lg:col-span-2">
                  <app-form-field [label]="('PURCHASES.reason' | translate)" [control]="group.controls.reason">
                    <input type="text" formControlName="reason" class="form-input" />
                  </app-form-field>
                </div>
                <div class="flex items-end justify-end pb-1">
                  <button type="button" (click)="removeItem($index)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                    <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                  </button>
                </div>
              </div>
            }
            <button type="button" (click)="addItem()" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <lucide-angular [img]="Plus" class="h-3.5 w-3.5"></lucide-angular>
              {{ 'COMMON.add' | translate }}
            </button>
          </div>

          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" (click)="closeForm()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button type="submit" [disabled]="form.invalid || itemGroups().length === 0 || saving()" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ saving() ? '…' : ('COMMON.create' | translate) }}
            </button>
          </div>
        </form>
      }

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
export class PurchaseReturnsComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<ReturnRow>[] = [
    { key: 'returnNumber', label: 'PURCHASES.return_number' },
    { key: 'supplier', label: 'PURCHASES.supplier' },
    { key: 'returnDate', label: 'PURCHASES.return_date' },
    { key: 'itemCount', label: 'PURCHASES.item_count', align: 'end' },
    { key: 'totalAmount', label: 'PURCHASES.total_amount', align: 'end' },
    { key: 'status', label: 'PURCHASES.status' },
    { key: 'returnedBy', label: 'PURCHASES.received_by' },
  ];

  protected readonly query = { page: 1, limit: 10 };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<ReturnRow[]>([]);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly supplierOptions = signal<SelectOption[]>([]);
  readonly productOptions = signal<SelectOption[]>([]);
  readonly receiptOptions = signal<SelectOption[]>([]);
  readonly lineBatchOptions = signal<SelectOption[][]>([]);

  protected readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    purchaseReceiptId: [''],
    reason: [''],
    items: this.fb.array<ReturnItemFormGroup>([]),
  });

  protected readonly Plus = Plus;
  protected readonly Trash2 = Trash2;

  ngOnInit() {
    this.load();
    this.api.get<any[]>('/suppliers/options').subscribe({
      next: (list) => this.supplierOptions.set(list.map((s) => ({ value: s.id, label: s.name }))),
      error: () => undefined,
    });
    this.api.get<PaginatedData<any>>('/products', { page: 1, limit: 500, isActive: true }).subscribe({
      next: (res) => this.productOptions.set(res.items.map((p) => ({ value: p.id, label: p.name }))),
      error: () => undefined,
    });
    this.form.controls.supplierId.valueChanges.subscribe(() => this.loadReceipts());
  }

  canReturn() {
    return this.authService.hasPermission('purchases.return');
  }

  itemGroups(): ReturnItemFormGroup[] {
    return this.form.controls.items.controls;
  }

  batchOptionsFor(index: number): SelectOption[] {
    return this.lineBatchOptions()[index] ?? [];
  }

  addItem() {
    const group = this.fb.nonNullable.group({
      productId: ['', Validators.required],
      batchId: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      reason: [''],
    });
    const index = this.form.controls.items.length;
    this.form.controls.items.push(group);
    this.lineBatchOptions.update((arr) => [...arr, []]);
    group.controls.productId.valueChanges.subscribe(() => this.onProductChange(index, group));
  }

  removeItem(index: number) {
    this.form.controls.items.removeAt(index);
    this.lineBatchOptions.update((arr) => arr.filter((_, i) => i !== index));
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  openForm() {
    this.form.reset({ supplierId: '', purchaseReceiptId: '', reason: '' });
    this.form.controls.items.clear();
    this.lineBatchOptions.set([]);
    this.addItem();
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  submit() {
    if (this.form.invalid || this.form.controls.items.length === 0) return;
    const raw = this.form.getRawValue();
    const payload = {
      supplierId: raw.supplierId,
      purchaseReceiptId: raw.purchaseReceiptId || undefined,
      reason: raw.reason.trim() || undefined,
      items: raw.items.map((item: any) => ({
        productId: item.productId,
        batchId: item.batchId || undefined,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        reason: item.reason.trim() || undefined,
      })),
    };
    this.saving.set(true);
    this.api.post('/purchase-returns', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('PURCHASES.return_created');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private onProductChange(index: number, group: ReturnItemFormGroup) {
    group.controls.batchId.setValue('');
    const productId = group.controls.productId.value;
    if (!productId) return;
    this.api.get<any[]>(`/batches/product/${productId}`).subscribe({
      next: (list) => {
        this.lineBatchOptions.update((arr) => {
          const next = [...arr];
          next[index] = list.map((b) => ({ value: b.id, label: `${b.batchNumber} (${b.remainingQuantity} left)` }));
          return next;
        });
      },
      error: () => undefined,
    });
  }

  private loadReceipts() {
    this.receiptOptions.set([]);
    const supplierId = this.form.controls.supplierId.value;
    if (!supplierId) return;
    this.api.get<PaginatedData<any>>('/purchase-receipts', { page: 1, limit: 500, supplierId }).subscribe({
      next: (res) => this.receiptOptions.set(res.items.map((r) => ({ value: r.id, label: r.receiptNumber }))),
      error: () => undefined,
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/purchase-returns', { page: this.query.page, limit: this.query.limit })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              returnNumber: item.returnNumber,
              supplier: item.supplier?.name ?? '—',
              returnDate: new Date(item.returnDate).toLocaleDateString(),
              itemCount: item.itemCount,
              totalAmount: Number(item.totalAmount),
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