import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface ProductRow {
  id: string;
  name: string;
  barcode?: string | null;
  categoryName: string;
  manufacturerName: string;
  unit: string;
  sellingPrice: string;
  stockQuantity: number;
  status: string;
}

interface CategoryOption {
  id: string;
  name: string;
  children?: CategoryOption[];
}

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('PRODUCTS.title' | translate)" [crumbs]="[('NAV.products' | translate)]">
        @if (canCreate()) {
          <button
            type="button"
            (click)="create()"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'PRODUCTS.new' | translate }}
          </button>
        }
      </app-page-header>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:max-w-xs">
          <app-search-input [placeholder]="('PRODUCTS.name' | translate)" (changed)="onSearch($event)" />
        </div>
        <div class="w-full sm:w-56">
          <app-select-search
            [options]="categoryOptions()"
            [placeholder]="('PRODUCTS.category' | translate)"
            [(ngModel)]="query.categoryId"
            (ngModelChange)="onFilterChange()"
          />
        </div>
        <div class="w-full sm:w-56">
          <app-select-search
            [options]="manufacturerOptions()"
            [placeholder]="('PRODUCTS.manufacturer' | translate)"
            [(ngModel)]="query.manufacturerId"
            (ngModelChange)="onFilterChange()"
          />
        </div>
        <div class="w-full sm:w-40">
          <select
            [ngModel]="query.status"
            (ngModelChange)="onStatus($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{{ 'COMMON.all' | translate }}</option>
            <option value="active">{{ 'COMMON.active' | translate }}</option>
            <option value="inactive">{{ 'COMMON.inactive' | translate }}</option>
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
        [clickable]="true"
        [hasActions]="canUpdate() || canDelete()"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
        (rowClick)="onRowClick($event)"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (canUpdate()) {
              <button
                type="button"
                (click)="onEdit($event, row)"
                class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30"
                [title]="('COMMON.edit' | translate)"
              >
                <lucide-angular [img]="Pencil" class="h-4 w-4"></lucide-angular>
              </button>
            }
            @if (canDelete()) {
              <button
                type="button"
                (click)="onDelete($event, row)"
                class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                [title]="('COMMON.delete' | translate)"
              >
                <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
              </button>
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class ProductsListComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly columns: TableColumn<ProductRow>[] = [
    { key: 'name', label: 'PRODUCTS.name', sortable: true },
    { key: 'categoryName', label: 'PRODUCTS.category' },
    { key: 'manufacturerName', label: 'PRODUCTS.manufacturer' },
    { key: 'barcode', label: 'PRODUCTS.barcode' },
    { key: 'unit', label: 'PRODUCTS.unit' },
    { key: 'sellingPrice', label: 'PRODUCTS.selling_price', align: 'end' },
    { key: 'stockQuantity', label: 'PRODUCTS.stock', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    manufacturerId: '',
    status: '',
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<ProductRow[]>([]);
  readonly categoryOptions = signal<SelectOption[]>([]);
  readonly manufacturerOptions = signal<SelectOption[]>([]);

  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;

  ngOnInit() {
    this.loadCategories();
    this.loadManufacturers();
    this.load();
  }

  canCreate() {
    return this.authService.hasPermission('products.create');
  }
  canUpdate() {
    return this.authService.hasPermission('products.update');
  }
  canDelete() {
    return this.authService.hasPermission('products.delete');
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onFilterChange() {
    this.query.page = 1;
    this.load();
  }

  onStatus(value: string) {
    this.query.status = value === 'active' || value === 'inactive' ? value : '';
    this.query.page = 1;
    this.load();
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  onRowClick(row: ProductRow) {
    this.router.navigate(['/products', row.id, 'edit']);
  }

  onEdit(event: MouseEvent, row: ProductRow) {
    event.stopPropagation();
    this.onRowClick(row);
  }

  onDelete(event: MouseEvent, row: ProductRow) {
    event.stopPropagation();
    const confirmed = window.confirm(`Delete ${row.name}?`);
    if (!confirmed) return;
    this.api.delete(`/products/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('PRODUCTS.deleted_success');
        this.load();
      },
    });
  }

  create() {
    this.router.navigate(['/products/new']);
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<ProductRow>>('/products', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
        categoryId: this.query.categoryId,
        manufacturerId: this.query.manufacturerId,
        isActive: this.query.status === 'active' ? true : this.query.status === 'inactive' ? false : '',
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.items.map((item) => this.toRow(item)));
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private toRow(item: any): ProductRow {
    return {
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      categoryName: item.category?.name ?? '',
      manufacturerName: item.manufacturer?.name ?? '',
      unit: item.unit,
      sellingPrice: `${Number(item.sellingPrice ?? 0).toFixed(2)}`,
      stockQuantity: item.stockQuantity ?? 0,
      status: item.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }

  private loadCategories() {
    this.api.get<CategoryOption[]>('/categories').subscribe({
      next: (tree) => {
        const flat: CategoryOption[] = [];
        const walk = (nodes: CategoryOption[]) => {
          for (const n of nodes) {
            flat.push(n);
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        this.categoryOptions.set(flat.map((c) => ({ value: c.id, label: c.name })));
      },
      error: () => undefined,
    });
  }

  private loadManufacturers() {
    this.api.get<Array<{ id: string; name: string }>>('/manufacturers/options').subscribe({
      next: (list) => this.manufacturerOptions.set(list.map((m) => ({ value: m.id, label: m.name }))),
      error: () => undefined,
    });
  }
}