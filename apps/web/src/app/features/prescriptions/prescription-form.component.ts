import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Plus, Trash2 } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface ItemControlGroup {
  productId: FormControl<string>;
  quantity: FormControl<number>;
  dosageInstructions: FormControl<string>;
  notes: FormControl<string>;
}

type ItemGroup = FormGroup<ItemControlGroup>;

@Component({
  selector: 'app-prescription-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/prescriptions" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'PRESCRIPTIONS.back_to_list' | translate }}
      </a>

      <app-page-header [title]="('PRESCRIPTIONS.new_prescription' | translate)" [crumbs]="[('NAV.prescriptions' | translate), ('PRESCRIPTIONS.new_prescription' | translate)]" />

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('PRESCRIPTIONS.customer' | translate)" [required]="true" [control]="form.controls.customerId">
              <app-select-search [options]="customerOptions()" formControlName="customerId" />
            </app-form-field>
            <app-form-field [label]="('PRESCRIPTIONS.doctor' | translate)" [control]="form.controls.doctorName">
              <input type="text" formControlName="doctorName" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('PRESCRIPTIONS.doctor_phone' | translate)" [control]="form.controls.doctorPhone">
              <input type="tel" formControlName="doctorPhone" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('PRESCRIPTIONS.issue_date' | translate)" [required]="true" [control]="form.controls.issueDate">
              <input type="date" formControlName="issueDate" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('PRESCRIPTIONS.notes' | translate)" [control]="form.controls.notes">
              <input type="text" formControlName="notes" class="form-input" />
            </app-form-field>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PRESCRIPTIONS.items' | translate }}</h2>
            <button type="button" (click)="addItem()" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              <lucide-angular [img]="Plus" class="h-3.5 w-3.5"></lucide-angular>
              {{ 'COMMON.add' | translate }}
            </button>
          </div>

          <div class="space-y-3">
            @for (group of itemGroups(); track $index) {
              <div [formGroup]="group" class="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-12 dark:border-slate-800">
                <div class="lg:col-span-4">
                  <app-form-field [label]="('PRESCRIPTIONS.product' | translate)" [required]="true" [control]="group.controls.productId">
                    <app-select-search [options]="productOptions()" formControlName="productId" />
                  </app-form-field>
                </div>
                <div class="lg:col-span-2">
                  <app-form-field [label]="('PRESCRIPTIONS.quantity' | translate)" [required]="true" [control]="group.controls.quantity">
                    <input type="number" min="1" formControlName="quantity" class="form-input" />
                  </app-form-field>
                </div>
                <div class="lg:col-span-3">
                  <app-form-field [label]="('PRESCRIPTIONS.dosage' | translate)" [control]="group.controls.dosageInstructions">
                    <input type="text" formControlName="dosageInstructions" class="form-input" />
                  </app-form-field>
                </div>
                <div class="lg:col-span-2">
                  <app-form-field [label]="('PRESCRIPTIONS.line_notes' | translate)" [control]="group.controls.notes">
                    <input type="text" formControlName="notes" class="form-input" />
                  </app-form-field>
                </div>
                <div class="flex items-end justify-end pb-1">
                  <button type="button" (click)="removeItem($index)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                    <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                  </button>
                </div>
              </div>
            }
            @if (itemGroups().length === 0) {
              <div class="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                {{ 'PRESCRIPTIONS.add_first_item' | translate }}
              </div>
            }
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button type="button" routerLink="/prescriptions" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
            {{ 'COMMON.cancel' | translate }}
          </button>
          <button type="submit" [disabled]="form.invalid || itemGroups().length === 0 || saving()" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
            {{ saving() ? '…' : ('COMMON.save' | translate) }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PrescriptionFormComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly customerOptions = signal<SelectOption[]>([]);
  readonly productOptions = signal<SelectOption[]>([]);
  readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    customerId: ['', Validators.required],
    doctorName: [''],
    doctorPhone: [''],
    issueDate: [this.toDateInput(new Date())],
    notes: [''],
    items: this.fb.array<ItemGroup>([]),
  });

  protected readonly Plus = Plus;
  protected readonly Trash2 = Trash2;
  protected readonly ArrowLeft = ArrowLeft;

  ngOnInit() {
    this.loadOptions();
    this.addItem();
  }

  itemGroups(): ItemGroup[] {
    return this.form.controls.items.controls;
  }

  addItem() {
    this.form.controls.items.push(
      this.fb.nonNullable.group({
        productId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]],
        dosageInstructions: [''],
        notes: [''],
      }),
    );
  }

  removeItem(index: number) {
    this.form.controls.items.removeAt(index);
  }

  submit() {
    if (this.form.invalid || this.form.controls.items.length === 0) return;
    const raw = this.form.getRawValue();
    const payload = {
      customerId: raw.customerId,
      doctorName: raw.doctorName?.trim() || undefined,
      doctorPhone: raw.doctorPhone?.trim() || undefined,
      issueDate: raw.issueDate,
      notes: raw.notes?.trim() || undefined,
      items: raw.items.map((item: any) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        dosageInstructions: item.dosageInstructions?.trim() || undefined,
        notes: item.notes?.trim() || undefined,
      })),
    };

    this.saving.set(true);
    this.api.post('/prescriptions', payload).subscribe({
      next: (created: any) => {
        this.saving.set(false);
        this.notifications.success('PRESCRIPTIONS.created_success');
        this.router.navigate(['/prescriptions', created.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private loadOptions() {
    this.api.get<any[]>('/customers/options').subscribe({
      next: (list) => this.customerOptions.set(list.map((c) => ({ value: c.id, label: c.name }))),
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