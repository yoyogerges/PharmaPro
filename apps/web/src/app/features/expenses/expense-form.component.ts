import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, LoaderCircle } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="mx-auto max-w-2xl space-y-4">
      <app-page-header [title]="('EXPENSES.new_expense' | translate)" [crumbs]="[('NAV.expenses' | translate), ('EXPENSES.new_expense' | translate)]" />
      <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
          <app-form-field [label]="('EXPENSES.category' | translate)" [required]="true" [control]="form.controls.categoryId">
            <app-select-search [options]="categoryOptions()" [placeholder]="('EXPENSES.select_category' | translate)" formControlName="categoryId" />
          </app-form-field>

          <app-form-field [label]="('EXPENSES.description' | translate)" [control]="form.controls.description">
            <input type="text" formControlName="description" class="form-input" />
          </app-form-field>

          <div class="grid gap-5 sm:grid-cols-2">
            <app-form-field [label]="('EXPENSES.amount' | translate)" [required]="true" [control]="form.controls.amount">
              <input type="number" min="0" step="0.01" formControlName="amount" class="form-input" />
            </app-form-field>

            <app-form-field [label]="('EXPENSES.date' | translate)" [required]="true" [control]="form.controls.date">
              <input type="date" formControlName="date" class="form-input" />
            </app-form-field>
          </div>

          <app-form-field [label]="('EXPENSES.payment_method' | translate)" [required]="true" [control]="form.controls.paymentMethod">
            <select formControlName="paymentMethod" class="form-input">
              @for (method of methods; track method) {
                <option [value]="method">{{ 'ENUMS.' + method | translate }}</option>
              }
            </select>
          </app-form-field>

          <div class="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              (click)="router.navigate(['/expenses'])"
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
export class ExpenseFormComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  readonly router = inject(Router);

  readonly methods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK'];

  protected readonly submitting = signal(false);
  protected readonly categoryOptions = signal<SelectOption[]>([]);

  protected readonly LoaderCircle = LoaderCircle;

  readonly form = this.fb.group({
    categoryId: ['', Validators.required],
    description: [''],
    amount: [null as number | null, Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    paymentMethod: ['CASH', Validators.required],
  });

  ngOnInit() {
    this.api.get<any[]>('/expense-categories').subscribe({
      next: (list) => this.categoryOptions.set(list.map((c) => ({ value: c.id, label: c.name }))),
      error: () => undefined,
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.notifications.error('COMMON.errors.required_fields');
      return;
    }
    const { categoryId, description, amount, date, paymentMethod } = this.form.value;
    this.submitting.set(true);
    this.api
      .post('/expenses', {
        categoryId,
        description: description || undefined,
        amount,
        date: new Date(date as string).toISOString(),
        paymentMethod,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.notifications.success('EXPENSES.created_success');
          this.router.navigate(['/expenses']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }
}