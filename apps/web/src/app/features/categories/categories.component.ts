import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus, X } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface CategoryNode {
  id: string;
  parentId?: string | null;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  children?: CategoryNode[];
}

interface CategoryRow {
  id: string;
  name: string;
  parentName: string;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  status: string;
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('CATEGORIES.title' | translate)" [crumbs]="[('NAV.categories' | translate)]" [subtitle]="('PRODUCTS.category_products' | translate)">
        @if (canCreate()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'CATEGORIES.new' | translate }}
          </button>
        }
      </app-page-header>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'CATEGORIES.edit' : 'CATEGORIES.new') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <app-form-field [label]="('CATEGORIES.name' | translate)" [required]="true" [control]="form.controls.name">
              <input type="text" formControlName="name" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('CATEGORIES.name_ar' | translate)" [control]="form.controls.nameAr">
              <input type="text" formControlName="nameAr" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('CATEGORIES.parent' | translate)" [control]="form.controls.parentId">
              <app-select-search formControlName="parentId" [options]="parentOptions()" [placeholder]="('COMMON.none' | translate)" />
            </app-form-field>
            <app-form-field [label]="('CATEGORIES.sort_order' | translate)" [control]="form.controls.sortOrder">
              <input type="number" step="1" formControlName="sortOrder" class="form-input" />
            </app-form-field>
          </div>
          <div class="mt-4 flex items-center gap-2">
            <input id="cat-active" type="checkbox" formControlName="isActive" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="cat-active" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'CATEGORIES.is_active' | translate }}</label>
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
        [hasActions]="canUpdate() || canDelete()"
        [showPagination]="false"
        [rowTemplate]="actionsTpl"
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
export class CategoriesComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<CategoryRow>[] = [
    { key: 'name', label: 'CATEGORIES.name' },
    { key: 'parentName', label: 'CATEGORIES.parent' },
    { key: 'productCount', label: 'CATEGORIES.product_count', align: 'end' },
    { key: 'sortOrder', label: 'CATEGORIES.sort_order', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  readonly loading = signal(true);
  readonly rows = signal<CategoryRow[]>([]);
  readonly flatNodes = signal<CategoryNode[]>([]);
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly parentOptions = signal<SelectOption[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    nameAr: [''],
    parentId: [null as string | null],
    sortOrder: [0],
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
    return this.authService.hasPermission('categories.create');
  }
  canUpdate() {
    return this.authService.hasPermission('categories.update');
  }
  canDelete() {
    return this.authService.hasPermission('categories.delete');
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ name: '', nameAr: '', parentId: null, sortOrder: 0, isActive: true });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onEdit(event: MouseEvent, row: CategoryRow) {
    event.stopPropagation();
    const node = this.flatNodes().find((c) => c.id === row.id);
    if (!node) return;
    this.editingId.set(row.id);
    this.form.patchValue({
      name: node.name,
      nameAr: node.nameAr ?? '',
      sortOrder: node.sortOrder,
      isActive: node.isActive,
    });
    this.formOpen.set(true);
  }

  onDelete(event: MouseEvent, row: CategoryRow) {
    event.stopPropagation();
    if (!window.confirm(`Delete ${row.name}?`)) return;
    this.api.delete(`/categories/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('CATEGORIES.deleted_success');
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
      nameAr: raw.nameAr?.trim() || undefined,
      parentId: raw.parentId ?? undefined,
      sortOrder: Number(raw.sortOrder) || 0,
      isActive: raw.isActive,
    };
    const id = this.editingId();
    const request = id ? this.api.patch(`/categories/${id}`, payload) : this.api.post('/categories', payload);
    request.subscribe({
      next: () => {
        this.notifications.success(id ? 'CATEGORIES.updated_success' : 'CATEGORIES.created_success');
        this.closeForm();
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api.get<CategoryNode[]>('/categories').subscribe({
      next: (tree) => {
        const flat: CategoryNode[] = [];
        const walk = (nodes: CategoryNode[]) => {
          for (const n of nodes) {
            flat.push(n);
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        this.flatNodes.set(flat);
        this.parentOptions.set(
          flat.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
        );
        this.rows.set(
          flat.map((c) => ({
            id: c.id,
            name: c.name,
            parentName: c.parentId ? flat.find((p) => p.id === c.parentId)?.name ?? '' : '',
            sortOrder: c.sortOrder,
            isActive: c.isActive,
            productCount: c.productCount ?? 0,
            status: c.isActive ? 'ACTIVE' : 'INACTIVE',
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}