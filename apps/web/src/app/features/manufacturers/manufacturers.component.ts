import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus, X, Building2 } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface ManufacturerRow {
  id: string;
  name: string;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  productCount: number;
  isActive: boolean;
  status: string;
}

@Component({
  selector: 'app-manufacturers',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('MANUFACTURERS.title' | translate)" [crumbs]="[('NAV.manufacturers' | translate)]" [subtitle]="('PRODUCTS.manufacturer_products' | translate)">
        @if (canCreate()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'MANUFACTURERS.new' | translate }}
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'MANUFACTURERS.edit' : 'MANUFACTURERS.new') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('MANUFACTURERS.name' | translate)" [required]="true" [control]="form.controls.name">
              <input type="text" formControlName="name" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('MANUFACTURERS.country' | translate)" [control]="form.controls.country">
              <input type="text" formControlName="country" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('COMMON.phone' | translate)" [control]="form.controls.phone">
              <input type="text" formControlName="phone" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('COMMON.email' | translate)" [control]="form.controls.email">
              <input type="email" formControlName="email" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('MANUFACTURERS.website' | translate)" [control]="form.controls.website">
              <input type="text" formControlName="website" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('COMMON.notes' | translate)" [control]="form.controls.notes">
              <input type="text" formControlName="notes" class="form-input" />
            </app-form-field>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <input id="mfr-active" type="checkbox" formControlName="isActive" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="mfr-active" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'CATEGORIES.is_active' | translate }}</label>
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
export class ManufacturersComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<ManufacturerRow>[] = [
    { key: 'name', label: 'MANUFACTURERS.name', sortable: true },
    { key: 'country', label: 'MANUFACTURERS.country' },
    { key: 'phone', label: 'COMMON.phone' },
    { key: 'productCount', label: 'MANUFACTURERS.product_count', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  readonly limit = 10;
  readonly page = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly rows = signal<ManufacturerRow[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    country: [''],
    phone: [''],
    email: [''],
    website: [''],
    notes: [''],
    isActive: [true],
  });

  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;
  protected readonly X = X;
  protected readonly Building2 = Building2;

  ngOnInit() {
    this.load();
  }

  canCreate() {
    return this.authService.hasPermission('manufacturers.create');
  }
  canUpdate() {
    return this.authService.hasPermission('manufacturers.update');
  }
  canDelete() {
    return this.authService.hasPermission('manufacturers.delete');
  }

  onPage(event: { page: number; limit: number }) {
    this.page.set(event.page);
    this.load();
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ name: '', country: '', phone: '', email: '', website: '', notes: '', isActive: true });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onEdit(event: MouseEvent, row: ManufacturerRow) {
    event.stopPropagation();
    this.api.get<any>(`/manufacturers/${row.id}`).subscribe({
      next: (m) => {
        this.editingId.set(row.id);
        this.form.patchValue({
          name: m.name,
          country: m.country ?? '',
          phone: m.phone ?? '',
          email: m.email ?? '',
          website: m.website ?? '',
          notes: m.notes ?? '',
          isActive: m.isActive,
        });
        this.formOpen.set(true);
      },
    });
  }

  onDelete(event: MouseEvent, row: ManufacturerRow) {
    event.stopPropagation();
    if (!window.confirm(`Delete ${row.name}?`)) return;
    this.api.delete(`/manufacturers/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('MANUFACTURERS.deleted_success');
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
      country: raw.country?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      website: raw.website?.trim() || undefined,
      notes: raw.notes?.trim() || undefined,
      isActive: raw.isActive,
    };
    const id = this.editingId();
    const request = id ? this.api.patch(`/manufacturers/${id}`, payload) : this.api.post('/manufacturers', payload);
    request.subscribe({
      next: () => {
        this.notifications.success(id ? 'MANUFACTURERS.updated_success' : 'MANUFACTURERS.created_success');
        this.closeForm();
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<ManufacturerRow>>('/manufacturers', { page: this.page(), limit: this.limit })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((m) => ({
              ...m,
              productCount: m.productCount ?? 0,
              status: m.isActive ? 'ACTIVE' : 'INACTIVE',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}