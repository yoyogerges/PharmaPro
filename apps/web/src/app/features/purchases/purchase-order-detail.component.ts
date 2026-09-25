import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, ArrowRightLeft, CheckCircle2, Pencil, Send, XCircle } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';

interface SpaceRow {
  id: string;
  product: string;
  quantity: number;
  received: number;
  unitPrice: number;
  lineTotal: number;
}

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  totalAmount: number;
}

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, RouterLink, PageHeaderComponent, DataTableComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/purchase-orders" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'PURCHASES.back_to_po' | translate }}
      </a>

      <app-page-header [title]="order()?.poNumber ?? ''" [subtitle]="order()?.supplier?.name ?? ''"
        [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_orders' | translate)]">
        @if (order()) {
          <span class="rounded-full px-3 py-1 text-xs font-bold" [class]="statusClass(order()!.status)">{{ order()!.status }}</span>
        }
        @if (order() && order()!.status === 'DRAFT' && canCreate()) {
          <button type="button" (click)="router.navigate(['/purchase-orders', orderId(), 'edit'])" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
            <lucide-angular [img]="Pencil" class="h-4 w-4"></lucide-angular>
            {{ 'PURCHASES.edit' | translate }}
          </button>
        }
        @if (order() && canApprove()) {
          @if (order()!.status === 'DRAFT') {
            <button type="button" (click)="action('submit', 'PURCHASES.po_submitted', 'PURCHASES.submit_confirm')" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
              <lucide-angular [img]="Send" class="h-4 w-4"></lucide-angular>
              {{ 'PURCHASES.submit' | translate }}
            </button>
          }
          @if (order()!.status === 'PENDING_APPROVAL') {
            <button type="button" (click)="action('approve', 'PURCHASES.po_approved', 'PURCHASES.approve_confirm')" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
              <lucide-angular [img]="CheckCircle2" class="h-4 w-4"></lucide-angular>
              {{ 'PURCHASES.approve' | translate }}
            </button>
            <button type="button" (click)="action('reject', 'PURCHASES.po_rejected', 'PURCHASES.reject_confirm')" class="inline-flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900">
              <lucide-angular [img]="XCircle" class="h-4 w-4"></lucide-angular>
              {{ 'PURCHASES.reject' | translate }}
            </button>
          }
        }
        @if (order() && canReceive() && ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order()!.status)) {
          <button type="button" (click)="router.navigate(['/purchase-orders', orderId(), 'receive'])" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="ArrowRightLeft" class="h-4 w-4"></lucide-angular>
            {{ 'PURCHASES.create_receipt' | translate }}
          </button>
        }
        @if (order() && canCreate() && ['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(order()!.status)) {
          <button type="button" (click)="action('cancel', 'PURCHASES.po_cancelled', 'PURCHASES.cancel_confirm')" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
            {{ 'PURCHASES.cancel' | translate }}
          </button>
        }
      </app-page-header>

      @if (order()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'PURCHASES.order_date' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ formatDate(order()!.orderDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'PURCHASES.expected_delivery' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ order()!.expectedDeliveryDate ? formatDate(order()!.expectedDeliveryDate) : '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'PURCHASES.created_by_label' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ userName(order()!.createdBy) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">{{ 'PURCHASES.approved_by_label' | translate }}</dt>
              <dd class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{{ order()!.approvedBy ? userName(order()!.approvedBy) : '—' }}</dd>
            </div>
          </dl>
          <div class="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-4 dark:border-slate-800">
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div class="text-xs text-slate-500">{{ 'PURCHASES.subtotal' | translate }}</div>
              <div class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">{{ money(order()!.subtotal) }}</div>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div class="text-xs text-slate-500">{{ 'PURCHASES.tax_amount' | translate }}</div>
              <div class="mt-1 text-base font-bold text-slate-800 dark:text-slate-100">{{ money(order()!.taxAmount) }}</div>
            </div>
            <div class="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <div class="text-xs text-slate-500">{{ 'PURCHASES.discount_amount' | translate }}</div>
              <div class="mt-1 text-base font-bold text-emerald-600">{{ money(order()!.discountAmount) }}</div>
            </div>
            <div class="rounded-xl bg-primary-50 p-3 dark:bg-primary-950/40">
              <div class="text-xs text-primary-600 dark:text-primary-400">{{ 'PURCHASES.total_amount' | translate }}</div>
              <div class="mt-1 text-base font-bold text-primary-700 dark:text-primary-300">{{ money(order()!.totalAmount) }}</div>
            </div>
          </div>
        </div>

        <div>
          <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PURCHASES.items' | translate }}</h2>
          <app-data-table
            [columns]="itemColumns"
            [rows]="orderItems()"
            [loading]="loading()"
            [hasActions]="false"
            [page]="1" [limit]="50" [total]="orderItems().length" [showPagination]="false"
          />
        </div>

        @if (order()!.receipts?.length) {
          <div>
            <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PURCHASES.returns' | translate }}</h2>
            <app-data-table
              [columns]="receiptColumns"
              [rows]="orderReceipts()"
              [loading]="loading()"
              [hasActions]="false"
              [page]="1" [limit]="50" [total]="orderReceipts().length" [showPagination]="false"
            />
          </div>
        }

        @if (order()!.notes) {
          <div class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <strong class="mb-1 block text-xs font-semibold uppercase text-slate-400">{{ 'PURCHASES.notes' | translate }}</strong>
            {{ order()!.notes }}
          </div>
        }
      }
    </div>
  `,
})
export class PurchaseOrderDetailComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly order = signal<any | null>(null);
  readonly orderItems = signal<SpaceRow[]>([]);
  readonly orderReceipts = signal<ReceiptRow[]>([]);
  readonly loading = signal(true);

  readonly itemColumns: TableColumn<SpaceRow>[] = [
    { key: 'product', label: 'PURCHASES.product' },
    { key: 'quantity', label: 'PURCHASES.quantity', align: 'end' },
    { key: 'received', label: 'PURCHASES.received_quantity', align: 'end' },
    { key: 'unitPrice', label: 'PURCHASES.unit_price', align: 'end' },
    { key: 'lineTotal', label: 'PURCHASES.line_total', align: 'end' },
  ];

  readonly receiptColumns: TableColumn<ReceiptRow>[] = [
    { key: 'receiptNumber', label: 'PURCHASES.receipt_number' },
    { key: 'receiptDate', label: 'PURCHASES.receipt_date' },
    { key: 'totalAmount', label: 'PURCHASES.total_amount', align: 'end' },
  ];

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Pencil = Pencil;
  protected readonly Send = Send;
  protected readonly CheckCircle2 = CheckCircle2;
  protected readonly XCircle = XCircle;
  protected readonly ArrowRightLeft = ArrowRightLeft;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  orderId(): string {
    return this.route.snapshot.paramMap.get('id') ?? '';
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

  statusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      APPROVED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
      PARTIALLY_RECEIVED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      RECEIVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  action(endpoint: string, successKey: string, confirmKey: string) {
    const order = this.order();
    if (!order) return;
    if (!window.confirm(`${order.poNumber}: ${this.translate.instant(confirmKey)}`)) return;
    this.api.post(`/purchase-orders/${order.id}/${endpoint}`, {}).subscribe({
      next: () => {
        this.notifications.success(successKey);
        this.load(order.id);
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  money(value: number): string {
    return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatDate(value: string): string {
    if (!value) return '';
    return new Date(value).toLocaleDateString();
  }

  userName(user: { firstName?: string; lastName?: string } | null | undefined): string {
    if (!user) return '—';
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  }

  private load(id: string) {
    this.loading.set(true);
    this.api.get<any>(`/purchase-orders/${id}`).subscribe({
      next: (order) => {
        this.order.set(order);
        this.orderItems.set(
          order.items.map((item: any) => ({
            id: item.id,
            product: item.product?.name ?? '—',
            quantity: item.quantity,
            received: item.receivedQuantity,
            unitPrice: Number(item.unitPrice),
            lineTotal: Number(item.totalPrice),
          })),
        );
        this.orderReceipts.set(
          (order.receipts ?? []).map((receipt: any) => ({
            id: receipt.id,
            receiptNumber: receipt.receiptNumber,
            receiptDate: this.formatDate(receipt.receiptDate),
            totalAmount: Number(receipt.totalAmount),
          })),
        );
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}