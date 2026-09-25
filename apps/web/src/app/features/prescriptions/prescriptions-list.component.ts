import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Plus } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';
import { DateRangePickerComponent, type DateRange } from '@shared/components/date-range-picker/date-range-picker.component';

interface PrescriptionRow {
  id: string;
  prescriptionNumber: string;
  issueDate: string;
  customer: string;
  doctorName: string;
  itemCount: number;
  totalQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  status: string;
  dispensedBy: string;
}

@Component({
  selector: 'app-prescriptions-list',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent, DateRangePickerComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header [title]="('PRESCRIPTIONS.title' | translate)" [crumbs]="[('NAV.prescriptions' | translate)]" />
        @if (canCreate()) {
          <button
            type="button"
            (click)="router.navigate(['/prescriptions/new'])"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'PRESCRIPTIONS.new_prescription' | translate }}
          </button>
        }
      </div>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="sm:w-72" [placeholder]="('PRESCRIPTIONS.search_placeholder' | translate)" (changed)="onSearch($event)" />
        <select [ngModel]="query.status" (ngModelChange)="onStatus($event)" class="form-input sm:w-44">
          <option value="">{{ 'COMMON.status' | translate }} · {{ 'COMMON.all' | translate }}</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ 'ENUMS.' + status | translate }}</option>
          }
        </select>
        <app-date-range-picker (changed)="onDateRange($event)" />
      </div>

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="query.page"
        [limit]="query.limit"
        [total]="total()"
        [hasActions]="false"
        [clickable]="true"
        (pageChange)="onPage($event)"
        (rowClick)="onRowClick($event)"
      />
    </div>
  `,
})
export class PrescriptionsListComponent {
  private readonly api = inject(ApiService);
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly statuses = ['PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED'];

  readonly columns: TableColumn<PrescriptionRow>[] = [
    { key: 'prescriptionNumber', label: 'PRESCRIPTIONS.number' },
    { key: 'issueDate', label: 'PRESCRIPTIONS.issue_date' },
    { key: 'customer', label: 'PRESCRIPTIONS.customer' },
    { key: 'doctorName', label: 'PRESCRIPTIONS.doctor' },
    { key: 'itemCount', label: 'PRESCRIPTIONS.items', align: 'end' },
    { key: 'totalQuantity', label: 'PRESCRIPTIONS.total_quantity', align: 'end' },
    { key: 'remainingQuantity', label: 'PRESCRIPTIONS.remaining_quantity', align: 'end' },
    { key: 'status', label: 'PRESCRIPTIONS.status' },
    { key: 'dispensedBy', label: 'PRESCRIPTIONS.dispensed_by' },
  ];

  protected readonly query = { page: 1, limit: 10, status: '', search: '', dateFrom: '', dateTo: '' };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<PrescriptionRow[]>([]);

  protected readonly Plus = Plus;

  ngOnInit() {
    this.load();
  }

  canCreate(): boolean {
    return this.authService.hasPermission('prescriptions.create');
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onStatus(value: string) {
    this.query.status = value;
    this.query.page = 1;
    this.load();
  }

  onDateRange(range: DateRange) {
    this.query.dateFrom = range.start;
    this.query.dateTo = range.end;
    this.query.page = 1;
    this.load();
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  onRowClick(row: PrescriptionRow) {
    this.router.navigate(['/prescriptions', row.id]);
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/prescriptions', {
        page: this.query.page,
        limit: this.query.limit,
        status: this.query.status,
        search: this.query.search,
        dateFrom: this.query.dateFrom,
        dateTo: this.query.dateTo,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              prescriptionNumber: item.prescriptionNumber,
              issueDate: new Date(item.issueDate).toLocaleDateString(),
              customer: item.customer?.name ?? '—',
              doctorName: item.doctorName ?? '—',
              itemCount: item.itemCount,
              totalQuantity: item.totalQuantity,
              dispensedQuantity: item.dispensedQuantity,
              remainingQuantity: item.remainingQuantity,
              status: item.status,
              dispensedBy: item.dispensedBy ? [item.dispensedBy.firstName, item.dispensedBy.lastName].filter(Boolean).join(' ') : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}