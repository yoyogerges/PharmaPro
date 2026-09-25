import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, LoaderCircle } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import type { SelectOption } from '@shared/components/select-search/select-search.component';

@Component({
  selector: 'app-payment-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="mx-auto max-w-2xl space-y-4">
      <app-page-header [title]="('PAYMENTS.new_payment' | translate)" [crumbs]="[('NAV.payments' | translate), ('PAYMENTS.new_payment' | translate)]" />
      <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <div class="grid gap-5 sm:grid-cols-2">
            <app-form-field [label]="('PAYMENTS.type' | translate)" [required]="true" [control]="form.controls.type">
              <select formControlName="type" (change)="onTypeChange()" class="form-input">
                @for (t of types; track t) {
                  <option [value]="t">{{ 'ENUMS.' + t | translate }}</option>
                }
              </select>
            </app-form-field>

            <app-form-field [label]="('PAYMENTS.entity' | translate)" [required]="true" [control]="form.controls.entityId">
              <select formControlName="entityId" class="form-input">
                <option value="">{{ entityLabel() }}</option>
                @for (option of entityOptions(); track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </app-form-field>
          </div>

          <div class="grid gap-5 sm:grid-cols-3">
            <app-form-field [label]="('PAYMENTS.amount' | translate)" [required]="true" [control]="form.controls.amount">
              <input type="number" min="0.01" step="0.01" formControlName="amount" class="form-input" />
            </app-form-field>

            <app-form-field [label]="('PAYMENTS.method' | translate)" [required]="true" [control]="form.controls.paymentMethod">
              <select formControlName="paymentMethod" class="form-input">
                @for (method of methods; track method) {
                  <option [value]="method">{{ 'ENUMS.' + method | translate }}</option>
                }
              </select>
            </app-form-field>

            <app-form-field [label]="('PAYMENTS.date' | translate)" [required]="true" [control]="form.controls.date">
              <input type="date" formControlName="date" class="form-input" />
            </app-form-field>
          </div>

          <app-form-field [label]="('PAYMENTS.reference' | translate)" [control]="form.controls.reference">
            <input type="text" formControlName="reference" class="form-input" />
          </app-form-field>

          <app-form-field [label]="('PAYMENTS.notes' | translate)" [control]="form.controls.notes">
            <textarea formControlName="notes" rows="3" class="form-input resize-none"></textarea>
          </app-form-field>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              (click)="router.navigate(['/payments'])"
              class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button
              type="submit"
              [disabled]="submitting()"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              @if (submitting()) {
                <lucide-angular [img]="LoaderCircle" class="h-4 w-4 animate-spin"></lucide-angular>
              }
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class PaymentFormComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  readonly router = inject(Router);

  readonly types = ['CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE_PAYMENT'];
  readonly methods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK'];
  readonly entityOptionsLabels: Record<string, string> = {
    CUSTOMER_PAYMENT: 'PAYMENTS.select_customer',
    SUPPLIER_PAYMENT: 'PAYMENTS.select_supplier',
    EXPENSE_PAYMENT: 'PAYMENTS.select_expense',
  };

  protected readonly submitting = signal(false);
  protected readonly loadingEntities = signal(false);
  protected readonly entityOptions = signal<SelectOption[]>([]);

  protected readonly LoaderCircle = LoaderCircle;

  readonly form = this.fb.group({
    type: ['CUSTOMER_PAYMENT', Validators.required],
    entityId: ['', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    paymentMethod: ['CASH', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    reference: [''],
    notes: [''],
  });

  ngOnInit() {
    this.loadEntities();
  }

  protected entityLabel(): string {
    return this.entityOptionsLabels[this.form.value.type ?? 'CUSTOMER_PAYMENT'] ?? 'PAYMENTS.select_customer';
  }

  onTypeChange() {
    this.form.controls.entityId.setValue('');
    this.loadEntities();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.notifications.error('COMMON.errors.required_fields');
      return;
    }
    const { type, entityId, amount, paymentMethod, date, reference, notes } = this.form.value;
    const payload: Record<string, unknown> = {
      type,
      amount,
      date: new Date(date as string).toISOString(),
      paymentMethod,
      reference: reference || undefined,
      notes: notes || undefined,
    };
    if (type === 'CUSTOMER_PAYMENT') payload['customerId'] = entityId;
    else if (type === 'SUPPLIER_PAYMENT') payload['supplierId'] = entityId;
    else payload['expenseId'] = entityId;
    this.submitting.set(true);
    this.api.post('/payments', payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notifications.success('PAYMENTS.created_success');
        this.router.navigate(['/payments']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private loadEntities() {
    const type = this.form.value.type;
    if (!type) return;
    this.loadingEntities.set(true);
    const request =
      type === 'CUSTOMER_PAYMENT'
        ? this.api.get<PaginatedData<any>>('/customers', { page: 1, limit: 100, status: 'active' })
        : type === 'SUPPLIER_PAYMENT'
          ? this.api.get<PaginatedData<any>>('/suppliers', { page: 1, limit: 100, status: 'active' })
          : this.api.get<PaginatedData<any>>('/expenses', { page: 1, limit: 100, status: 'APPROVED' });
    request.subscribe({
      next: (res) => {
        this.entityOptions.set(
          type === 'CUSTOMER_PAYMENT'
            ? res.items.map((c: any) => ({ value: c.id, label: c.name }))
            : type === 'SUPPLIER_PAYMENT'
              ? res.items.map((s: any) => ({ value: s.id, label: s.name }))
              : res.items.map((e: any) => ({ value: e.id, label: e.description ?? '—' })),
        );
        this.loadingEntities.set(false);
      },
      error: () => this.loadingEntities.set(false),
    });
  }
}