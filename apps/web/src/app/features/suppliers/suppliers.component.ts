import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus, X } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface SupplierRow {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  taxNumber?: string | null;
  currentBalance: number;
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SUPPLIERS.title' | translate)" [crumbs]="[('NAV.suppliers' | translate)]">
        @if (canCreate()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'SUPPLIERS.new' | translate }}
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'SUPPLIERS.edit' : 'SUPPLIERS.new') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('SUPPLIERS.name' | translate)" [required]="true" [control]="form.controls.name">
              <input type="text" formControlName="name" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SUPPLIERS.contact_person' | translate)" [control]="form.controls.contactPerson">
              <input type="text" formControlName="contactPerson" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('COMMON.phone' | translate)" [control]="form.controls.phone">
              <input type="text" formControlName="phone" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('COMMON.email' | translate)" [control]="form.controls.email">
              <input type="email" formControlName="email" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SUPPLIERS.address' | translate)" [control]="form.controls.address">
              <input type="text" formControlName="address" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SUPPLIERS.tax_number' | translate)" [control]="form.controls.taxNumber">
              <input type="text" formControlName="taxNumber" class="form-input" />
            </app-form-field>
            @if (!editingId()) {
              <app-form-field [label]="('SUPPLIERS.opening_balance' | translate)" [control]="form.controls.openingBalance">
                <input type="number" step="0.01" min="0" formControlName="openingBalance" class="form-input" />
              </app-form-field>
            }
            <app-form-field [label]="('COMMON.notes' | translate)" [control]="form.controls.notes">
              <input type="text" formControlName="notes" class="form-input" />
            </app-form-field>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <input id="sup-active" type="checkbox" formControlName="isActive" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="sup-active" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'CATEGORIES.is_active' | translate }}</label>
            <button type="submit" [disabled]="form.invalid" class="ms-auto inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      }

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="page()"
        [limit]="limit"
        [total]="total()"
        [hasActions]="canUpdate() || canDelete()"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (canUpdate()) {
              <button type="button" (click)="onEdit($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30">
                <lucide-angular [img]="Pencil" class="h-4 w-4"></lucide-angular>
              </button>
            }
            @if (canDelete()) {
              <button type="button" (click)="onDelete($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
              </button>
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class SuppliersComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<SupplierRow>[] = [
    { key: 'name', label: 'SUPPLIERS.name', sortable: true },
    { key: 'contactPerson', label: 'SUPPLIERS.contact_person' },
    { key: 'phone', label: 'COMMON.phone' },
    { key: 'currentBalance', label: 'SUPPLIERS.balance', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  readonly limit = 10;
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly rows = signal<SupplierRow[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    contactPerson: [''],
    phone: [''],
    email: [''],
    address: [''],
    taxNumber: [''],
    openingBalance: [0],
    notes: [''],
    isActive: [true],
  });

  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;
  protected readonly X = X;

  ngOnInit() {
    this.load();
  }

  canCreate() {
    return this.authService.hasPermission('suppliers.create');
  }
  canUpdate() {
    return this.authService.hasPermission('suppliers.update');
  }
  canDelete() {
    return this.authService.hasPermission('suppliers.delete');
  }

  onPage(event: { page: number; limit: number }) {
    this.page.set(event.page);
    this.load();
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ name: '', contactPerson: '', phone: '', email: '', address: '', taxNumber: '', openingBalance: 0, notes: '', isActive: true });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onEdit(event: MouseEvent, row: SupplierRow) {
    event.stopPropagation();
    this.api.get<any>(`/suppliers/${row.id}`).subscribe({
      next: (s) => {
        this.editingId.set(row.id);
        this.form.patchValue({
          name: s.name,
          contactPerson: s.contactPerson ?? '',
          phone: s.phone ?? '',
          email: s.email ?? '',
          address: s.address ?? '',
          taxNumber: s.taxNumber ?? '',
          notes: s.notes ?? '',
          isActive: s.isActive,
        });
        this.formOpen.set(true);
      },
    });
  }

  onDelete(event: MouseEvent, row: SupplierRow) {
    event.stopPropagation();
    if (!window.confirm(`Delete ${row.name}?`)) return;
    this.api.delete(`/suppliers/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('SUPPLIERS.deleted_success');
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: any = {
      name: raw.name.trim(),
      contactPerson: raw.contactPerson?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      address: raw.address?.trim() || undefined,
      taxNumber: raw.taxNumber?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
      isActive: raw.isActive,
    };
    const id = this.editingId();
    if (!id) payload.openingBalance = Number(raw.openingBalance) || 0;
    const request = id ? this.api.patch(`/suppliers/${id}`, payload) : this.api.post('/suppliers', payload);
    request.subscribe({
      next: () => {
        this.notifications.success(id ? 'SUPPLIERS.updated_success' : 'SUPPLIERS.created_success');
        this.closeForm();
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<SupplierRow>>('/suppliers', { page: this.page(), limit: this.limit })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((s) => ({
              ...s,
              currentBalance: Number(s.currentBalance ?? 0),
              status: s.isActive ? 'ACTIVE' : 'INACTIVE',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}