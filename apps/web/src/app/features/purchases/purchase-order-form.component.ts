import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Plus, Trash2 } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface Totals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

interface ItemControlGroup {
  productId: FormControl<string>;
  quantity: FormControl<number>;
  unitPrice: FormControl<number>;
  discount: FormControl<number>;
  taxRate: FormControl<number>;
}

type ItemGroup = FormGroup<ItemControlGroup>;

@Component({
  selector: 'app-purchase-order-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/purchase-orders" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'PURCHASES.back_to_po' | translate }}
      </a>

      <app-page-header [title]="editMode() ? ('PURCHASES.edit' | translate) : ('PURCHASES.new_po' | translate)"
        [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_orders' | translate)]" />

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('PURCHASES.supplier' | translate)" [required]="true" [control]="form.controls.supplierId">
              <app-select-search [options]="supplierOptions()" formControlName="supplierId" />
            </app-form-field>
            <app-form-field [label]="('PURCHASES.order_date' | translate)" [required]="true" [control]="form.controls.orderDate">
              <input type="date" formControlName="orderDate" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('PURCHASES.expected_delivery' | translate)" [control]="form.controls.expectedDeliveryDate">
              <input type="date" formControlName="expectedDeliveryDate" class="form-input" />
            </app-form-field>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PURCHASES.items' | translate }}</h2>
            <button type="button" (click)="addItem()" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              <lucide-angular [img]="Plus" class="h-3.5 w-3.5"></lucide-angular>
              {{ 'COMMON.add' | translate }}
            </button>
          </div>

          <div class="space-y-3">
            @for (group of itemGroups(); track $index) {
              <div [formGroup]="group" class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-800">
                <div class="lg:col-span-4">
                  <app-form-field [label]="('PURCHASES.product' | translate)" [required]="true" [control]="group.controls.productId">
                    <app-select-search [options]="productOptions()" formControlName="productId" />
                  </app-form-field>
                </div>
                <app-form-field [label]="('PURCHASES.quantity' | translate)" [required]="true" [control]="group.controls.quantity">
                  <input type="number" min="1" formControlName="quantity" class="form-input" />
                </app-form-field>
                <app-form-field [label]="('PURCHASES.unit_price' | translate)" [required]="true" [control]="group.controls.unitPrice">
                  <input type="number" min="0" step="0.01" formControlName="unitPrice" class="form-input" />
                </app-form-field>
                <app-form-field [label]="('PURCHASES.discount' | translate)" [control]="group.controls.discount">
                  <input type="number" min="0" step="0.1" formControlName="discount" class="form-input" />
                </app-form-field>
                <app-form-field [label]="('PURCHASES.tax_rate' | translate)" [control]="group.controls.taxRate">
                  <input type="number" min="0" step="0.1" formControlName="taxRate" class="form-input" />
                </app-form-field>
                <div class="flex items-end justify-between gap-2 pb-1 lg:col-span-2">
                  <div>
                    <div class="mb-1 block text-xs font-medium text-slate-400">{{ 'PURCHASES.line_total' | translate }}</div>
                    <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ lineTotal(group) }}</div>
                  </div>
                  <button type="button" (click)="removeItem($index)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                    <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                  </button>
                </div>
              </div>
            }
            @if (itemGroups().length === 0) {
              <div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                {{ 'PURCHASES.po_create_error' | translate }}
              </div>
            }
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="grid gap-4 sm:grid-cols-2">
            <app-form-field [label]="('PURCHASES.discount_amount' | translate)" [control]="form.controls.discountAmount">
              <input type="number" min="0" step="0.01" formControlName="discountAmount" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('PURCHASES.notes' | translate)" [control]="form.controls.notes">
              <textarea rows="2" formControlName="notes" class="form-input"></textarea>
            </app-form-field>
          </div>
          <dl class="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 text-sm dark:border-slate-800 sm:flex-row sm:justify-end sm:gap-8">
            <div class="flex justify-between gap-6">
              <dt class="text-slate-500">{{ 'PURCHASES.subtotal' | translate }}</dt>
              <dd class="font-semibold text-slate-800 dark:text-slate-100">{{ totals().subtotal.toFixed(2) }}</dd>
            </div>
            <div class="flex justify-between gap-6">
              <dt class="text-slate-500">{{ 'PURCHASES.discount_amount' | translate }}</dt>
              <dd class="font-semibold text-emerald-600">-{{ totals().discount.toFixed(2) }}</dd>
            </div>
            <div class="flex justify-between gap-6">
              <dt class="text-slate-500">{{ 'PURCHASES.tax_amount' | translate }}</dt>
              <dd class="font-semibold text-slate-800 dark:text-slate-100">{{ totals().tax.toFixed(2) }}</dd>
            </div>
            <div class="flex justify-between gap-6">
              <dt class="font-semibold text-slate-700 dark:text-slate-200">{{ 'PURCHASES.total_amount' | translate }}</dt>
              <dd class="font-bold text-primary-600">{{ totals().total.toFixed(2) }}</dd>
            </div>
          </dl>
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" routerLink="/purchase-orders" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button type="submit" [disabled]="form.invalid || itemGroups().length === 0 || saving()" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ saving() ? '…' : ('COMMON.save' | translate) }}
            </button>
          </div>
        </div>
      </form>
    </div>
  `,
})
export class PurchaseOrderFormComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly supplierOptions = signal<SelectOption[]>([]);
  readonly productOptions = signal<SelectOption[]>([]);
  readonly saving = signal(false);
  readonly editMode = signal(false);
  readonly totals = signal<Totals>({ subtotal: 0, tax: 0, discount: 0, total: 0 });

  protected readonly form = this.fb.nonNullable.group({
    supplierId: ['', Validators.required],
    orderDate: [this.toDateInput(new Date())],
    expectedDeliveryDate: [''],
    items: this.fb.array<ItemGroup>([]),
    discountAmount: [0],
    notes: [''],
  });

  protected readonly Plus = Plus;
  protected readonly Trash2 = Trash2;
  protected readonly ArrowLeft = ArrowLeft;

  ngOnInit() {
    this.loadOptions();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode.set(true);
      this.loadOrder(id);
    }
    this.form.valueChanges.subscribe(() => this.recompute());
  }

  itemGroups(): ItemGroup[] {
    return this.form.controls.items.controls;
  }

  addItem() {
    this.form.controls.items.push(
      this.fb.nonNullable.group({
        productId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        unitPrice: [0, [Validators.required, Validators.min(0)]],
        discount: [0],
        taxRate: [0],
      }),
    );
  }

  removeItem(index: number) {
    this.form.controls.items.removeAt(index);
  }

  lineTotal(group: ItemGroup): string {
    const raw = group.getRawValue();
    const line = Number(raw.quantity) * Number(raw.unitPrice || 0);
    const lineDiscount = (line * (Number(raw.discount || 0))) / 100;
    const lineTax = ((line - lineDiscount) * (Number(raw.taxRate || 0))) / 100;
    return (line - lineDiscount + lineTax).toFixed(2);
  }

  submit() {
    if (this.form.invalid || this.form.controls.items.length === 0) return;
    const raw = this.form.getRawValue();
    const payload = {
      supplierId: raw.supplierId,
      orderDate: raw.orderDate,
      expectedDeliveryDate: raw.expectedDeliveryDate || undefined,
      discountAmount: Number(raw.discountAmount) || 0,
      notes: raw.notes?.trim() || undefined,
      items: raw.items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
        taxRate: Number(item.taxRate || 0),
      })),
    };

    this.saving.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    const request = id ? this.api.patch(`/purchase-orders/${id}`, payload) : this.api.post('/purchase-orders', payload);
    request.subscribe({
      next: (created: any) => {
        this.saving.set(false);
        this.notifications.success('PURCHASES.po_saved');
        this.router.navigate(['/purchase-orders', created.id ?? id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private recompute() {
    const raw = this.form.getRawValue();
    let subtotal = 0;
    let tax = 0;
    let discountTotal = 0;
    for (const item of raw.items as any[]) {
      const line = Number(item.quantity) * Number(item.unitPrice || 0);
      const lineDiscount = (line * (Number(item.discount || 0))) / 100;
      const lineTax = ((line - lineDiscount) * (Number(item.taxRate || 0))) / 100;
      subtotal += line;
      discountTotal += lineDiscount;
      tax += lineTax;
    }
    discountTotal += Number(raw.discountAmount) || 0;
    const total = subtotal - discountTotal + tax;
    this.totals.set({ subtotal, tax, discount: discountTotal, total });
  }

  private loadOrder(id: string) {
    this.api.get<any>(`/purchase-orders/${id}`).subscribe({
      next: (order) => {
        this.form.patchValue({
          supplierId: order.supplierId,
          orderDate: this.toDateInput(order.orderDate),
          expectedDeliveryDate: order.expectedDeliveryDate ? this.toDateInput(order.expectedDeliveryDate) : '',
          discountAmount: Number(order.discountAmount) || 0,
          notes: order.notes ?? '',
        });
        this.form.controls.items.clear();
        for (const item of order.items) {
          this.form.controls.items.push(
            this.fb.nonNullable.group({
              productId: [item.productId, Validators.required],
              quantity: [item.quantity, [Validators.required, Validators.min(1)]],
              unitPrice: [Number(item.unitPrice), [Validators.required, Validators.min(0)]],
              discount: [Number(item.discount)],
              taxRate: [Number(item.taxRate)],
            }),
          );
        }
        this.recompute();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private loadOptions() {
    this.api.get<any[]>('/suppliers/options').subscribe({
      next: (list) => this.supplierOptions.set(list.map((s) => ({ value: s.id, label: s.name }))),
      error: () => undefined,
    });
    this.api.get<PaginatedData<any>>('/products', { page: 1, limit: 500, isActive: true }).subscribe({
      next: (res) => this.productOptions.set(res.items.map((p) => ({ value: p.id, label: p.name }))),
      error: () => undefined,
    });
  }

  private toDateInput(value: string | Date): string {
    const d = new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}