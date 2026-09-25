import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, ArrowRightLeft, CheckCircle2, Plus, Send, XCircle } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';

interface PoRow {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  progress: number;
  createdBy: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, SearchInputComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('PURCHASES.po_title' | translate)" [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_orders' | translate)]">
        @if (canCreate()) {
          <button type="button" (click)="router.navigate(['/purchase-orders/new'])" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'PURCHASES.new_po' | translate }}
          </button>
        }
      </app-page-header>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div class="w-full sm:max-w-xs">
          <app-search-input [placeholder]="('PURCHASES.search_placeholder' | translate)" (changed)="onSearch($event)" />
        </div>
        <div class="w-full sm:w-52">
          <select
            [ngModel]="query.status"
            (ngModelChange)="onStatus($event)"
            class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">{{ 'COMMON.all' | translate }}</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CANCELLED">CANCELLED</option>
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
        [hasActions]="true"
        [clickable]="true"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
        (rowClick)="onRowClick($event)"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (row.status === 'DRAFT' && canCreate()) {
              <button type="button" (click)="onEdit($event, row)" class="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800">
                {{ 'COMMON.edit' | translate }}
              </button>
              <button type="button" (click)="onSubmit($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30" title="{{ 'PURCHASES.submit' | translate }}">
                <lucide-angular [img]="Send" class="h-4 w-4"></lucide-angular>
              </button>
              <button type="button" (click)="onCancel($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="{{ 'PURCHASES.cancel' | translate }}">
                <lucide-angular [img]="XCircle" class="h-4 w-4"></lucide-angular>
              </button>
            }
            @if (row.status === 'PENDING_APPROVAL' && canApprove()) {
              <button type="button" (click)="onApprove($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/30" title="{{ 'PURCHASES.approve' | translate }}">
                <lucide-angular [img]="CheckCircle2" class="h-4 w-4"></lucide-angular>
              </button>
              <button type="button" (click)="onReject($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="{{ 'PURCHASES.reject' | translate }}">
                <lucide-angular [img]="XCircle" class="h-4 w-4"></lucide-angular>
              </button>
            }
            @if (['APPROVED', 'PARTIALLY_RECEIVED'].includes(row.status) && canReceive()) {
              <button type="button" (click)="onReceive($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30" title="{{ 'PURCHASES.create_receipt' | translate }}">
                <lucide-angular [img]="ArrowRightLeft" class="h-4 w-4"></lucide-angular>
              </button>
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class PurchaseOrdersComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  readonly router = inject(Router);

  readonly columns: TableColumn<PoRow>[] = [
    { key: 'poNumber', label: 'PURCHASES.po_number' },
    { key: 'supplier', label: 'PURCHASES.supplier' },
    { key: 'orderDate', label: 'PURCHASES.order_date' },
    { key: 'status', label: 'PURCHASES.status' },
    { key: 'progress', label: 'PURCHASES.received_quantity', align: 'end' },
    { key: 'totalAmount', label: 'PURCHASES.total_amount', align: 'end' },
    { key: 'createdBy', label: 'PURCHASES.received_by' },
  ];

  protected readonly query = {
    page: 1,
    limit: 10,
    status: '',
    search: '',
  };

  readonly loading = signal(true);
  readonly total = signal(0);
  readonly rows = signal<PoRow[]>([]);

  protected readonly Plus = Plus;
  protected readonly Send = Send;
  protected readonly XCircle = XCircle;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly ArrowRightLeft = ArrowRightLeft;

  ngOnInit() {
    this.load();
  }

  canCreate() {
    return this.authService.hasPermission('purchases.create');
  }
  canApprove() {
    return this.authService.hasPermission('purchases.approve');
  }
  canReceive() {
    return this.authService.hasPermission('purchases.receive');
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

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  onRowClick(row: PoRow) {
    this.router.navigate(['/purchase-orders', row.id]);
  }

  onEdit(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    this.router.navigate(['/purchase-orders', row.id, 'edit']);
  }

  onReceive(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    this.router.navigate(['/purchase-orders', row.id, 'receive']);
  }

  onSubmit(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.poNumber}: ${this.t('PURCHASES.submit_confirm')}`)) return;
    this.post(`/purchase-orders/${row.id}/submit`, 'PURCHASES.po_submitted');
  }

  onApprove(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.poNumber}: ${this.t('PURCHASES.approve_confirm')}`)) return;
    this.post(`/purchase-orders/${row.id}/approve`, 'PURCHASES.po_approved');
  }

  onReject(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.poNumber}: ${this.t('PURCHASES.reject_confirm')}`)) return;
    this.post(`/purchase-orders/${row.id}/reject`, 'PURCHASES.po_rejected');
  }

  onCancel(event: MouseEvent, row: PoRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.poNumber}: ${this.t('PURCHASES.cancel_confirm')}`)) return;
    this.post(`/purchase-orders/${row.id}/cancel`, 'PURCHASES.po_cancelled');
  }

  private t(key: string): string {
    return this.translate.instant(key);
  }

  private post(url: string, successKey: string) {
    this.api.post(url, {}).subscribe({
      next: () => {
        this.notifications.success(successKey);
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/purchase-orders', {
        page: this.query.page,
        limit: this.query.limit,
        status: this.query.status,
        search: this.query.search,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((item: any) => ({
              id: item.id,
              poNumber: item.poNumber,
              supplier: item.supplier?.name ?? '—',
              orderDate: this.formatDate(item.orderDate),
              status: item.status,
              progress: item.receivedProgress ?? 0,
              totalAmount: Number(item.totalAmount),
              createdBy: item.createdBy ? [item.createdBy.firstName, item.createdBy.lastName].filter(Boolean).join(' ') : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
  }
}