import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, AlertTriangle, Boxes, CheckCircle2, Package, Wallet } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface StockLevelRow {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  totalBatches: number;
  reorderLevel: number;
  stockValue: number;
  status: string;
}

interface Valuation {
  totalProducts: number;
  totalUnits: number;
  batchCount: number;
  lowStockCount: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  expiredBatches: number;
  expiredUnits: number;
}

interface CategoryOption {
  id: string;
  name: string;
  children?: CategoryOption[];
}

@Component({
  selector: 'app-stock-levels',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('INVENTORY.title' | translate)" [crumbs]="[('NAV.inventory' | translate)]" />

      @if (valuation()) {
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'INVENTORY.summary.products' | translate }}</p>
              <lucide-angular [img]="Package" class="h-4 w-4 text-primary-500"></lucide-angular>
            </div>
            <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ valuation()!.totalProducts }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'INVENTORY.summary.total_units' | translate }}</p>
              <lucide-angular [img]="Boxes" class="h-4 w-4 text-secondary-500"></lucide-angular>
            </div>
            <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ valuation()!.totalUnits }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'INVENTORY.summary.cost_value' | translate }}</p>
              <lucide-angular [img]="Wallet" class="h-4 w-4 text-emerald-500"></lucide-angular>
            </div>
            <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ money(valuation()!.costValue) }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'INVENTORY.summary.low_stock' | translate }}</p>
              <lucide-angular [img]="AlertTriangle" class="h-4 w-4 text-red-500"></lucide-angular>
            </div>
            <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{{ valuation()!.lowStockCount }}</p>
          </div>
        </div>
      }

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:max-w-xs">
          <app-search-input [placeholder]="('INVENTORY.search' | translate)" (changed)="onSearch($event)" />
        </div>
        <div class="w-full sm:w-56">
          <app-select-search
            [options]="categoryOptions()"
            [placeholder]="('INVENTORY.category' | translate)"
            [(ngModel)]="query.categoryId"
            (ngModelChange)="onFilterChange()"
          />
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" [(ngModel)]="query.isLowStock" (ngModelChange)="onFilterChange()" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          {{ 'INVENTORY.low_stock_only' | translate }}
        </label>
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" [(ngModel)]="query.inStock" (ngModelChange)="onFilterChange()" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
          {{ 'INVENTORY.in_stock_only' | translate }}
        </label>
      </div>

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
export class StockLevelsComponent {
  private readonly api = inject(ApiService);

  readonly columns: TableColumn<StockLevelRow>[] = [
    { key: 'name', label: 'INVENTORY.product', sortable: true },
    { key: 'category', label: 'INVENTORY.category' },
    { key: 'totalQuantity', label: 'INVENTORY.total_quantity', align: 'end' },
    { key: 'totalBatches', label: 'INVENTORY.batches_count', align: 'end' },
    { key: 'reorderLevel', label: 'INVENTORY.reorder_level', align: 'end' },
    { key: 'stockValue', label: 'INVENTORY.stock_value', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    search: '',
    categoryId: '',
    isLowStock: false,
    inStock: false,
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<StockLevelRow[]>([]);
  readonly valuation = signal<Valuation | null>(null);
  readonly categoryOptions = signal<SelectOption[]>([]);

  protected readonly Package = Package;
  protected readonly Boxes = Boxes;
  protected readonly Wallet = Wallet;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly CheckCircle2 = CheckCircle2;

  ngOnInit() {
    this.loadCategories();
    this.loadValuation();
    this.load();
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

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  money(value: number): string {
    return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/inventory/stock-levels', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
        categoryId: this.query.categoryId,
        isLowStock: this.query.isLowStock,
        inStock: this.query.inStock,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item) => ({
              id: item.productId,
              name: item.name,
              category: item.category ?? '',
              totalQuantity: item.totalQuantity,
              totalBatches: item.totalBatches,
              reorderLevel: item.reorderLevel,
              stockValue: Number(item.stockValue ?? 0),
              status: item.isLowStock ? 'LOW' : 'OK',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadValuation() {
    this.api.get<Valuation>('/inventory/valuation').subscribe({
      next: (v) => this.valuation.set(v),
      error: () => undefined,
    });
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
}