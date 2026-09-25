import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, PackageCheck } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface ReceiveLine {
  id: string;
  productId: string;
  product: string;
  quantity: number;
  receivedQuantity: number;
  remaining: number;
  unitPrice: number;
  toReceive: number;
  batchNumber: string;
  expiryDate: string;
}

@Component({
  selector: 'app-purchase-receive',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LucideAngularModule, RouterLink, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/purchase-orders" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'PURCHASES.back_to_po' | translate }}
      </a>

      <app-page-header [title]="('PURCHASES.receive_po' | translate)" [subtitle]="order()?.poNumber ?? ''"
        [crumbs]="[('NAV.purchases' | translate), ('NAV.purchase_orders' | translate)]" />

      @if (order() && receivable()) {
        <form (ngSubmit)="submit()" class="space-y-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div class="grid gap-4 sm:grid-cols-2">
              <app-form-field [label]="('PURCHASES.invoice_number' | translate)" [control]="invoiceForm">
                <input type="text" [(ngModel)]="invoiceNumber" name="invoiceNumber" class="form-input" />
              </app-form-field>
              <app-form-field [label]="('PURCHASES.supplier' | translate)">
                <input type="text" [value]="order()?.supplier?.name ?? ''" disabled class="form-input opacity-70" />
              </app-form-field>
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PURCHASES.items' | translate }}</h2>
            <div class="space-y-4">
              @for (line of lines(); track line.id) {
                <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div class="mb-3 flex items-center justify-between gap-3">
                    <div class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ line.product }}</div>
                    <div class="text-xs text-slate-500">
                      {{ 'PURCHASES.outstanding' | translate }}: <span class="font-semibold text-slate-700 dark:text-slate-200">{{ line.remaining }}</span>
                    </div>
                  </div>
                  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <app-form-field [label]="('PURCHASES.received_quantity' | translate)" [control]="null">
                      <input type="number" min="0" [max]="line.remaining" [(ngModel)]="line.toReceive" [ngModelOptions]="{ standalone: true }" class="form-input" />
                    </app-form-field>
                    <app-form-field [label]="('PURCHASES.unit_price' | translate)">
                      <input type="number" [(ngModel)]="line.unitPrice" [ngModelOptions]="{ standalone: true }" class="form-input" />
                    </app-form-field>
                    <app-form-field [label]="('PURCHASES.batch_number' | translate)" [control]="null">
                      <input type="text" [(ngModel)]="line.batchNumber" [ngModelOptions]="{ standalone: true }" class="form-input" placeholder="e.g. B-2026-001" />
                    </app-form-field>
                    <app-form-field [label]="('PURCHASES.expiry_date' | translate)" [control]="null">
                      <input type="date" [(ngModel)]="line.expiryDate" [ngModelOptions]="{ standalone: true }" class="form-input" />
                    </app-form-field>
                  </div>
                </div>
              }
            </div>
            <div class="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="button" routerLink="/purchase-orders" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                {{ 'COMMON.cancel' | translate }}
              </button>
              <button type="submit" [disabled]="saving() || readyLines().length === 0" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
                <lucide-angular [img]="PackageCheck" class="h-4 w-4"></lucide-angular>
                {{ 'PURCHASES.create_receipt' | translate }}
              </button>
            </div>
          </div>
        </form>
      } @else if (order()) {
        <div class="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm font-semibold text-red-600 dark:border-red-900 dark:bg-red-950/30">
          {{ 'PURCHASES.po_receive_error' | translate }}
        </div>
      }
    </div>
  `,
})
export class PurchaseReceiveComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly order = signal<any | null>(null);
  readonly lines = signal<ReceiveLine[]>([]);
  readonly saving = signal(false);
  invoiceNumber = '';

  protected readonly invoiceForm = null;
  protected readonly ArrowLeft = ArrowLeft;
  protected readonly PackageCheck = PackageCheck;

  readonly receivable = computed(() => ['APPROVED', 'PARTIALLY_RECEIVED'].includes(this.order()?.status));
  readonly readyLines = computed(() => this.lines().filter((l) => l.toReceive > 0 && l.batchNumber.trim() && l.expiryDate));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  submit() {
    const ready = this.readyLines();
    if (ready.length === 0) return;
    const payload = {
      purchaseOrderId: this.order()!.id,
      invoiceNumber: this.invoiceNumber.trim() || undefined,
      items: ready.map((line) => ({
        productId: line.productId,
        purchaseOrderItemId: line.id,
        receivedQuantity: line.toReceive,
        unitPrice: Number(line.unitPrice),
        batchNumber: line.batchNumber.trim(),
        expiryDate: line.expiryDate,
      })),
    };
    this.saving.set(true);
    this.api.post('/purchase-receipts', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('PURCHASES.receipt_created');
        this.router.navigate(['/purchase-orders', this.order()!.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private load(id: string) {
    this.api.get<any>(`/purchase-orders/${id}`).subscribe({
      next: (order) => {
        this.order.set(order);
        this.lines.set(
          order.items
            .filter((item: any) => item.quantity > item.receivedQuantity)
            .map((item: any) => ({
              id: item.id,
              productId: item.productId,
              product: item.product?.name ?? '—',
              quantity: item.quantity,
              receivedQuantity: item.receivedQuantity,
              remaining: item.quantity - item.receivedQuantity,
              unitPrice: Number(item.unitPrice),
              toReceive: item.quantity - item.receivedQuantity,
              batchNumber: '',
              expiryDate: '',
            })),
        );
        this.invoiceNumber = order.poNumber;
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }
}