import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Printer, RotateCcw } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { SkeletonComponent } from '@shared/components/loading-spinner/loading-spinner.component';
import { PharmacyCurrencyPipe } from '@shared/pipes/pharmacy-currency.pipe';

@Component({
  selector: 'app-sale-detail',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LucideAngularModule, PageHeaderComponent, SkeletonComponent, PharmacyCurrencyPipe],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="sale()?.invoiceNumber ?? ('SALES.detail' | translate)" [crumbs]="[('NAV.sales' | translate), ('SALES.detail' | translate)]">
        <button
          type="button"
          routerLink="/sales/{{ sale()?.id }}/receipt"
          class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <lucide-angular [img]="Printer" class="h-4 w-4"></lucide-angular>
          {{ 'SALES.print_receipt' | translate }}
        </button>
        @if (canReturn()) {
          <button
            type="button"
            routerLink="/sales-returns/new/{{ sale()?.id }}"
            class="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-600 transition hover:bg-primary-50 dark:border-primary-700 dark:bg-slate-900 dark:text-primary-400"
          >
            <lucide-angular [img]="RotateCcw" class="h-4 w-4"></lucide-angular>
            {{ 'SALES.create_return' | translate }}
          </button>
        }
      </app-page-header>

      @if (loading()) {
        <div class="flex h-40 items-center justify-center">
          <app-skeleton></app-skeleton>
        </div>
      } @else if (!sale()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p class="text-sm text-slate-500">{{ 'SALES.sale_not_found' | translate }}</p>
        </div>
      } @else {
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="statusClass(sale()!.status)">
            {{ 'ENUMS.' + sale()!.status | translate }}
          </span>
          <span class="rounded-full px-3 py-1 text-xs font-semibold" [class]="paymentClass(sale()!.paymentStatus)">
            {{ 'ENUMS.' + sale()!.paymentStatus | translate }}
          </span>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <dl class="space-y-3">
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.customer' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.customer?.name ?? '—' }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.date' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatDate(sale()!.saleDate) }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.cashier' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ fullName(sale()!.cashier) }}</dd>
              </div>
            </dl>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <dl class="space-y-3">
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.subtotal' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.subtotal | pharmacyCurrency }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.tax_amount' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.taxAmount | pharmacyCurrency }}</dd>
              </div>
              <div class="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <dt class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'SALES.total_amount' | translate }}</dt>
                <dd class="text-base font-bold text-primary-600 dark:text-primary-400">{{ sale()!.totalAmount | pharmacyCurrency }}</dd>
              </div>
            </dl>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <dl class="space-y-3">
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.paid' | translate }}</dt>
                <dd class="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{{ sale()!.paidAmount | pharmacyCurrency }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.change' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.changeAmount | pharmacyCurrency }}</dd>
              </div>
              <div class="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <dt class="text-xs font-medium text-slate-500">{{ 'SALES.notes' | translate }}</dt>
                <dd class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ sale()!.notes ?? '—' }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ 'SALES.items' | translate }}</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-100 text-start text-xs font-medium text-slate-500 dark:border-slate-800">
                  <th class="px-5 py-3 text-start">{{ 'SALES.product' | translate }}</th>
                  <th class="px-5 py-3 text-start">{{ 'SALES.batch' | translate }}</th>
                  <th class="px-5 py-3 text-end">{{ 'SALES.quantity' | translate }}</th>
                  <th class="px-5 py-3 text-end">{{ 'SALES.unit_price' | translate }}</th>
                  <th class="px-5 py-3 text-end">{{ 'SALES.line_total' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of sale()!.items; track item.id) {
                  <tr class="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                    <td class="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{{ item.product?.name ?? '—' }}</td>
                    <td class="px-5 py-3 text-slate-500">{{ item.batch?.batchNumber ?? '—' }}</td>
                    <td class="px-5 py-3 text-end text-slate-600 dark:text-slate-300">{{ item.quantity }}</td>
                    <td class="px-5 py-3 text-end text-slate-600 dark:text-slate-300">{{ item.unitPrice | pharmacyCurrency }}</td>
                    <td class="px-5 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">{{ item.totalPrice | pharmacyCurrency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div class="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ 'SALES.payments' | translate }}</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-start text-xs font-medium text-slate-500 dark:border-slate-800">
                    <th class="px-5 py-3 text-start">{{ 'SALES.method' | translate }}</th>
                    <th class="px-5 py-3 text-end">{{ 'SALES.amount' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (payment of sale()!.payments; track payment.id) {
                    <tr class="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                      <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ 'ENUMS.' + payment.method | translate }}</td>
                      <td class="px-5 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">{{ payment.amount | pharmacyCurrency }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="2" class="px-5 py-4 text-center text-sm text-slate-400">{{ 'SALES.no_payments' | translate }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div class="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ 'SALES.returns' | translate }}</h2>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 text-start text-xs font-medium text-slate-500 dark:border-slate-800">
                    <th class="px-5 py-3 text-start">{{ 'SALES_RETURNS.return_number' | translate }}</th>
                    <th class="px-5 py-3 text-end">{{ 'SALES_RETURNS.total_amount' | translate }}</th>
                    <th class="px-5 py-3 text-end">{{ 'SALES_RETURNS.status' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (ret of sale()!.returns; track ret.id) {
                    <tr class="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                      <td class="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{{ ret.returnNumber }}</td>
                      <td class="px-5 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">{{ ret.totalAmount | pharmacyCurrency }}</td>
                      <td class="px-5 py-3 text-end text-slate-600 dark:text-slate-300">{{ 'ENUMS.' + ret.status | translate }}</td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="3" class="px-5 py-4 text-center text-sm text-slate-400">{{ 'SALES.no_returns' | translate }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <a routerLink="/sales" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600">
          <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
          {{ 'SALES.back_to_sales' | translate }}
        </a>
      }
    </div>
  `,
})
export class SaleDetailComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly sale = signal<any | null>(null);
  readonly loading = signal(true);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Printer = Printer;
  protected readonly RotateCcw = RotateCcw;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.api.get<any>(`/sales/${id}`).subscribe({
      next: (sale) => {
        this.sale.set(sale);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  canReturn(): boolean {
    return this.authService.hasPermission('sales.return') && ['COMPLETED', 'PARTIALLY_RETURNED'].includes(this.sale()?.status ?? '');
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      RETURNED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
      PARTIALLY_RETURNED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  paymentClass(status: string): string {
    const map: Record<string, string> = {
      PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      PARTIALLY_PAID: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      UNPAID: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      REFUNDED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    };
    return map[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  fullName(user: any): string {
    return user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '—';
  }
}