import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Printer } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-receipt-view',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-slate-100 py-8 dark:bg-slate-950">
      <div class="mx-auto w-full max-w-md px-4">
        <div class="mb-4 flex items-center justify-between print:hidden">
          <a routerLink="/sales" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600">
            <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
            {{ 'SALES.back_to_sales' | translate }}
          </a>
          <button
            type="button"
            (click)="print()"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="Printer" class="h-4 w-4"></lucide-angular>
            {{ 'SALES.print' | translate }}
          </button>
        </div>

        @if (loading()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
          </div>
        } @else if (!receipt()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <p class="text-sm text-slate-500">{{ 'SALES.sale_not_found' | translate }}</p>
          </div>
        } @else {
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-4 print:shadow-none dark:border-slate-800 dark:bg-white">
            <div class="text-center">
              <h1 class="text-lg font-bold text-slate-900">{{ pharmacy()?.name ?? 'PharmaPro' }}</h1>
              @if (pharmacy()?.address) {
                <p class="mt-0.5 text-xs text-slate-600">{{ pharmacy()!.address }}</p>
              }
              <p class="mt-0.5 text-xs text-slate-600">{{ pharmacy()?.phone ?? '' }}</p>
              @if (pharmacy()?.taxNumber) {
                <p class="mt-0.5 text-xs text-slate-600">{{ 'SALES.tax_number' | translate }}: {{ pharmacy()!.taxNumber }}</p>
              }
            </div>

            <div class="mt-4 border-y border-dashed border-slate-300 py-3 text-xs text-slate-700">
              <div class="flex justify-between">
                <span>{{ 'SALES.invoice' | translate }}</span>
                <span class="font-semibold">{{ receipt()!.invoiceNumber }}</span>
              </div>
              <div class="mt-1 flex justify-between">
                <span>{{ 'SALES.date' | translate }}</span>
                <span>{{ formatDate(receipt()!.saleDate) }}</span>
              </div>
              <div class="mt-1 flex justify-between">
                <span>{{ 'SALES.cashier' | translate }}</span>
                <span>{{ fullName(receipt()!.cashier) }}</span>
              </div>
              @if (receipt()!.customer) {
                <div class="mt-1 flex justify-between">
                  <span>{{ 'SALES.customer' | translate }}</span>
                  <span>{{ receipt()!.customer.name }}</span>
                </div>
              }
            </div>

            <table class="mt-4 w-full text-xs text-slate-800">
              <thead>
                <tr class="border-b border-slate-200 text-start">
                  <th class="py-1.5 text-start font-semibold">{{ 'SALES.product' | translate }}</th>
                  <th class="py-1.5 text-center font-semibold">{{ 'SALES.quantity' | translate }}</th>
                  <th class="py-1.5 text-end font-semibold">{{ 'SALES.unit_price' | translate }}</th>
                  <th class="py-1.5 text-end font-semibold">{{ 'SALES.line_total' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of receipt()!.items; track $index) {
                  <tr class="border-b border-dashed border-slate-200">
                    <td class="py-1.5">
                      <p class="font-medium">{{ item.name }}</p>
                      @if (item.batchNumber) {
                        <p class="text-[10px] text-slate-500">{{ 'SALES.batch' | translate }}: {{ item.batchNumber }}</p>
                      }
                    </td>
                    <td class="py-1.5 text-center">{{ item.quantity }}</td>
                    <td class="py-1.5 text-end">{{ money(item.unitPrice) }}</td>
                    <td class="py-1.5 text-end font-semibold">{{ money(item.totalPrice) }}</td>
                  </tr>
                }
              </tbody>
            </table>

            <div class="mt-3 space-y-1 text-xs text-slate-700">
              <div class="flex justify-between">
                <span>{{ 'SALES.subtotal' | translate }}</span>
                <span>{{ money(receipt()!.subtotal) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ 'SALES.tax_amount' | translate }}</span>
                <span>{{ money(receipt()!.taxAmount) }}</span>
              </div>
              <div class="flex justify-between text-sm font-bold text-slate-900">
                <span>{{ 'SALES.total_amount' | translate }}</span>
                <span>{{ money(receipt()!.totalAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ 'SALES.paid' | translate }}</span>
                <span>{{ money(receipt()!.paidAmount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>{{ 'SALES.change' | translate }}</span>
                <span>{{ money(receipt()!.changeAmount) }}</span>
              </div>
            </div>

            <p class="mt-4 text-center text-[10px] text-slate-500">{{ 'SALES.thanks_message' | translate }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ReceiptViewComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);

  readonly receipt = signal<any | null>(null);
  readonly pharmacy = signal<{ name: string; nameAr?: string | null; address?: string | null; phone?: string | null; taxNumber?: string | null; currency?: string } | null>(null);
  readonly loading = signal(true);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Printer = Printer;

  ngOnInit() {
    this.api.get<any>('/settings/public').subscribe({ next: (p) => this.pharmacy.set(p), error: () => undefined });
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.api.get<any>(`/sales/receipt/${id}`).subscribe({
      next: (receipt) => {
        this.receipt.set(receipt);
        this.loading.set(false);
        setTimeout(() => window.print(), 400);
      },
      error: (err) => {
        this.loading.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  money(value: number): string {
    const currency = this.pharmacy()?.currency ?? 'SAR';
    return `${currency} ${Number(value ?? 0).toFixed(2)}`;
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }

  fullName(user: any): string {
    return user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '—';
  }

  print() {
    window.print();
  }
}