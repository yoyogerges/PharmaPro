import { Component, computed, inject, input, output, type TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-angular';
import { LoadingSpinnerComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

export interface TableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'start' | 'center' | 'end';
  class?: string;
}

export interface TablePageEvent {
  page: number;
  limit: number;
}

export interface TableSortEvent {
  key: string;
  direction: 'asc' | 'desc';
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    LucideAngularModule,
    LoadingSpinnerComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead class="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              @for (column of columns(); track column.key) {
                <th
                  scope="col"
                  class="select-none px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                  [class.text-end]="column.align === 'end'"
                  [class.text-center]="column.align === 'center'"
                  [style.width]="column.width"
                >
                  @if (column.sortable) {
                    <button type="button" (click)="toggleSort(column.key)" class="inline-flex items-center gap-1 uppercase transition hover:text-slate-700 dark:hover:text-slate-200">
                      {{ column.label | translate }}
                      <lucide-angular
                        [img]="ArrowUpDown"
                        class="h-3 w-3"
                        [class.opacity-100]="sortKey() === column.key"
                        [class.opacity-40]="sortKey() !== column.key"
                      ></lucide-angular>
                    </button>
                  } @else {
                    {{ column.label | translate }}
                  }
                </th>
              }
              @if (hasActions()) {
                <th scope="col" class="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ actionsLabel() }}
                </th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @if (loading()) {
              <tr>
                <td [attr.colspan]="columns().length + 1">
                  <app-loading-spinner />
                </td>
              </tr>
            } @else if (rows().length === 0) {
              <tr>
                <td [attr.colspan]="columns().length + 1">
                  <app-empty-state [title]="emptyTitle()" [message]="emptyMessage()" />
                </td>
              </tr>
            } @else {
              @for (row of rows(); track trackBy($index, row)) {
                <tr
                  class="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                  [class.cursor-pointer]="clickable()"
                  (click)="clickable() && rowClick.emit(row)"
                >
                  @for (column of columns(); track column.key) {
                    <td
                      class="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300"
                      [class.text-end]="column.align === 'end'"
                      [class.text-center]="column.align === 'center'"
                      [class]="column.class"
                    >
                      {{ cellText(row, column) }}
                    </td>
                  }
                  @if (hasActions()) {
                    <td class="whitespace-nowrap px-4 py-3 text-end">
                      @if (rowTemplate()) {
                        <ng-container *ngTemplateOutlet="rowTemplate()!; context: { $implicit: row }" />
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      @if (showPagination() && totalPages() > 1) {
        <div class="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row dark:border-slate-800">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ rangeStart() }}–{{ rangeEnd() }} / {{ total() }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goTo(page() - 1)"
              [disabled]="page() <= 1"
              class="rounded-md border border-slate-300 p-1.5 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:enabled:hover:bg-slate-800"
            >
              <lucide-angular [img]="ChevronLeft" class="h-4 w-4"></lucide-angular>
            </button>
            <span class="text-xs text-slate-600 dark:text-slate-300">
              {{ page() }} / {{ totalPages() }}
            </span>
            <button
              type="button"
              (click)="goTo(page() + 1)"
              [disabled]="page() >= totalPages()"
              class="rounded-md border border-slate-300 p-1.5 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:enabled:hover:bg-slate-800"
            >
              <lucide-angular [img]="ChevronRight" class="h-4 w-4"></lucide-angular>
            </button>
            <select
              [ngModel]="limit()"
              (ngModelChange)="onLimitChange($event)"
              class="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              @for (size of pageSizes; track size) {
                <option [value]="size">{{ size }} / page</option>
              }
            </select>
          </div>
        </div>
      }
    </div>
  `,
})
export class DataTableComponent<T = any> {
  private readonly translate = inject(TranslateService);

  readonly columns = input.required<TableColumn<T>[]>();
  readonly rows = input.required<T[]>();
  readonly loading = input(false);
  readonly hasActions = input(true);
  readonly actionsLabel = input('ACTIONS');
  readonly emptyTitle = input('COMMON.empty.no_data');
  readonly emptyMessage = input<string>();
  readonly clickable = input(false);

  readonly page = input(1);
  readonly limit = input(10);
  readonly total = input(0);
  readonly sortKey = input<string>();
  readonly sortDirection = input<'asc' | 'desc'>('desc');

  readonly showPagination = input(true);
  readonly pageSizes = [5, 10, 25, 50, 100];
  readonly rowTemplate = input<TemplateRef<{ $implicit: T }>>();

  readonly pageChange = output<TablePageEvent>();
  readonly sortChange = output<TableSortEvent>();
  readonly rowClick = output<T>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.limit() + 1));
  readonly rangeEnd = computed(() => Math.min(this.total(), this.page() * this.limit()));

  protected readonly ArrowUpDown = ArrowUpDown;
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly ChevronRight = ChevronRight;

  goTo(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.pageChange.emit({ page, limit: this.limit() });
  }

  onLimitChange(limit: number) {
    this.pageChange.emit({ page: 1, limit: Number(limit) });
  }

  toggleSort(key: string) {
    const direction = this.sortKey() === key && this.sortDirection() === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key, direction });
  }

  protected trackBy = (_: number, row: T): string | number =>
    (row as any)?.id ?? (row as any)?.key ?? _;

  protected cellValue(row: T, column: TableColumn<T>): unknown {
    return (row as Record<string, unknown>)[column.key];
  }

  protected cellText(row: T, column: TableColumn<T>): unknown {
    const value = this.cellValue(row, column);
    if (typeof value === 'string' && /^[A-Z0-9_]{2,}$/.test(value)) {
      const key = `ENUMS.${value}`;
      const translated = this.translate.instant(key);
      return translated === key ? value : translated;
    }
    return value;
  }
}