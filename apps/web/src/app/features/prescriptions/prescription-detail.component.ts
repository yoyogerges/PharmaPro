import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Import, Ban, X, Check } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { ConfirmDialogService } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { StatusBadgeComponent, toneForStatus } from '@shared/components/status-badge/status-badge.component';

interface DispenseLine {
  prescriptionItemId: string;
  productName: string;
  remaining: number;
  quantity: number;
}

@Component({
  selector: 'app-prescription-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, LucideAngularModule, StatusBadgeComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/prescriptions" class="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400">
        <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
        {{ 'PRESCRIPTIONS.back_to_list' | translate }}
      </a>

      @if (loading()) {
        <div class="flex h-40 items-center justify-center">
          <div class="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
        </div>
      } @else if (!rx()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p class="text-sm text-slate-500">{{ 'PRESCRIPTIONS.not_found' | translate }}</p>
        </div>
      } @else {
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <h1 class="text-lg font-bold text-slate-900 dark:text-white">{{ rx()!.prescriptionNumber }}</h1>
              <app-status-badge [label]="('ENUMS.' + rx()!.status | translate)" [tone]="toneForStatus(rx()!.status)" />
            </div>
            <div class="flex items-center gap-2">
              @if (canDispense()) {
                <button
                  type="button"
                  (click)="openDispense()"
                  class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
                >
                  <lucide-angular [img]="Import" class="h-4 w-4"></lucide-angular>
                  {{ 'PRESCRIPTIONS.dispense' | translate }}
                </button>
              }
              @if (canCancel()) {
                <button
                  type="button"
                  (click)="onCancel()"
                  class="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <lucide-angular [img]="Ban" class="h-4 w-4"></lucide-angular>
                  {{ 'PRESCRIPTIONS.cancel_prescription' | translate }}
                </button>
              }
            </div>
          </div>

          <dl class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.customer' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rx()!.customer?.name ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.doctor' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rx()!.doctorName ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.doctor_phone' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rx()!.doctorPhone ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.issue_date' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ formatDate(rx()!.issueDate) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.dispensed_by' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {{ dispenserName() }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.dispensed_at' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rx()!.dispensedAt ? formatDate(rx()!.dispensedAt) : '—' }}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-xs text-slate-500">{{ 'PRESCRIPTIONS.notes' | translate }}</dt>
              <dd class="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ rx()!.notes ?? '—' }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ 'PRESCRIPTIONS.items' | translate }}: {{ rx()!.itemCount }}
            </span>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {{ 'PRESCRIPTIONS.total_quantity' | translate }}: {{ rx()!.totalQuantity }}
            </span>
            <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {{ 'PRESCRIPTIONS.dispensed_quantity' | translate }}: {{ rx()!.dispensedQuantity }}
            </span>
            <span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {{ 'PRESCRIPTIONS.remaining_quantity' | translate }}: {{ rx()!.remainingQuantity }}
            </span>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PRESCRIPTIONS.items' | translate }}</h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="text-xs uppercase text-slate-400">
                <tr class="border-b border-slate-100 dark:border-slate-800">
                  <th class="px-5 py-3 font-medium">{{ 'PRESCRIPTIONS.product' | translate }}</th>
                  <th class="px-5 py-3 text-end font-medium">{{ 'PRESCRIPTIONS.quantity' | translate }}</th>
                  <th class="px-5 py-3 text-end font-medium">{{ 'PRESCRIPTIONS.dispensed' | translate }}</th>
                  <th class="px-5 py-3 text-end font-medium">{{ 'PRESCRIPTIONS.remaining' | translate }}</th>
                  <th class="px-5 py-3 font-medium">{{ 'PRESCRIPTIONS.dosage' | translate }}</th>
                  <th class="px-5 py-3 font-medium">{{ 'PRESCRIPTIONS.line_notes' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (item of rx()!.items; track item.id) {
                  <tr class="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                    <td class="px-5 py-3">
                      <p class="font-medium text-slate-800 dark:text-slate-100">{{ item.product.name }}</p>
                      <p class="text-xs text-slate-400">{{ item.product.sku ?? '' }}</p>
                    </td>
                    <td class="px-5 py-3 text-end font-semibold text-slate-800 dark:text-slate-100">{{ item.quantity }}</td>
                    <td class="px-5 py-3 text-end font-semibold text-emerald-600">{{ item.dispensedQuantity }}</td>
                    <td class="px-5 py-3 text-end font-semibold text-amber-600">{{ item.remainingQuantity }}</td>
                    <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ item.dosageInstructions ?? '—' }}</td>
                    <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ item.notes ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ 'PRESCRIPTIONS.linked_sales' | translate }}</h2>
          </div>
          @if (rx()!.sales?.length) {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="text-xs uppercase text-slate-400">
                  <tr class="border-b border-slate-100 dark:border-slate-800">
                    <th class="px-5 py-3 font-medium">{{ 'PRESCRIPTIONS.invoice_number' | translate }}</th>
                    <th class="px-5 py-3 font-medium">{{ 'PRESCRIPTIONS.issue_date' | translate }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (sale of rx()!.sales; track sale.id) {
                    <tr class="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40" (click)="router.navigate(['/sales', sale.id])">
                      <td class="px-5 py-3 font-medium text-primary-600 dark:text-primary-400">{{ sale.invoiceNumber }}</td>
                      <td class="px-5 py-3 text-slate-600 dark:text-slate-300">{{ formatDate(sale.saleDate) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="px-5 py-6 text-center text-sm text-slate-400">{{ 'PRESCRIPTIONS.no_linked_sales' | translate }}</p>
          }
        </div>
      }
    </div>

    @if (showDispense()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" (click)="closeDispense()">
        <div class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ 'PRESCRIPTIONS.dispense_title' | translate }}</h3>
            <button type="button" (click)="closeDispense()" class="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <p class="mt-1 text-xs text-slate-500">{{ 'PRESCRIPTIONS.dispense_hint' | translate }}</p>

          <div class="mt-4 space-y-3">
            @for (line of dispenseLines(); track line.prescriptionItemId) {
              <div class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div>
                  <p class="text-sm font-medium text-slate-800 dark:text-slate-100">{{ line.productName }}</p>
                  <p class="text-xs text-slate-400">{{ 'PRESCRIPTIONS.remaining' | translate }}: {{ line.remaining }}</p>
                </div>
                <input
                  type="number"
                  min="0"
                  [max]="line.remaining"
                  [ngModel]="line.quantity"
                  (ngModelChange)="onDispenseQty(line, $event)"
                  [disabled]="line.remaining <= 0"
                  class="form-input w-24 text-end"
                />
              </div>
            }
          </div>

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" (click)="closeDispense()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button
              type="button"
              (click)="submitDispense()"
              [disabled]="dispensing() || noDispenseQuantity()"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              <lucide-angular [img]="Check" class="h-4 w-4"></lucide-angular>
              {{ dispensing() ? '…' : ('PRESCRIPTIONS.confirm_dispense' | translate) }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PrescriptionDetailComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);

  readonly rx = signal<any | null>(null);
  readonly loading = signal(true);
  readonly showDispense = signal(false);
  readonly dispensing = signal(false);
  readonly dispenseLines = signal<DispenseLine[]>([]);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Import = Import;
  protected readonly Ban = Ban;
  protected readonly X = X;
  protected readonly Check = Check;
  protected readonly toneForStatus = toneForStatus;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id);
  }

  canDispense(): boolean {
    const status = this.rx()?.status;
    return this.authService.hasPermission('prescriptions.dispense') && (status === 'PENDING' || status === 'PARTIALLY_DISPENSED');
  }

  canCancel(): boolean {
    const status = this.rx()?.status;
    return this.authService.hasPermission('prescriptions.update') && status !== 'DISPENSED' && status !== 'CANCELLED';
  }

  openDispense() {
    this.dispenseLines.set(
      this.rx()!.items
        .filter((item: any) => item.remainingQuantity > 0)
        .map((item: any) => ({
          prescriptionItemId: item.id,
          productName: item.product.name,
          remaining: item.remainingQuantity,
          quantity: item.remainingQuantity,
        })),
    );
    this.showDispense.set(true);
  }

  closeDispense() {
    this.showDispense.set(false);
  }

  onDispenseQty(line: DispenseLine, value: string) {
    const parsed = Math.max(0, Math.floor(Number(value) || 0));
    const capped = Math.min(parsed, line.remaining);
    this.dispenseLines.update((lines) => lines.map((l) => (l.prescriptionItemId === line.prescriptionItemId ? { ...l, quantity: capped } : l)));
  }

  noDispenseQuantity(): boolean {
    return this.dispenseLines().every((l) => l.quantity <= 0);
  }

  dispenserName(): string {
    const user = this.rx()?.dispensedBy;
    return user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '—';
  }

  submitDispense() {
    const items = this.dispenseLines().filter((l) => l.quantity > 0);
    if (items.length === 0) return;
    this.dispensing.set(true);
    this.api
      .post(`/prescriptions/${this.rx()!.id}/dispense`, {
        items: items.map((l) => ({ prescriptionItemId: l.prescriptionItemId, quantity: l.quantity })),
      })
      .subscribe({
        next: () => {
          this.dispensing.set(false);
          this.showDispense.set(false);
          this.notifications.success('PRESCRIPTIONS.dispensed_success');
          this.load(this.rx()!.id);
        },
        error: (err) => {
          this.dispensing.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }

  async onCancel() {
    if (!this.rx()) return;
    const confirmed = await this.confirm.confirm(
      'PRESCRIPTIONS.cancel_title',
      'PRESCRIPTIONS.cancel_confirm_message',
      'PRESCRIPTIONS.cancel_prescription',
      'COMMON.cancel',
      'danger',
    );
    if (!confirmed) return;
    this.api.post(`/prescriptions/${this.rx()!.id}/cancel`).subscribe({
      next: () => {
        this.notifications.success('PRESCRIPTIONS.cancelled_success');
        this.load(this.rx()!.id);
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load(id: string) {
    this.loading.set(true);
    this.api.get<any>(`/prescriptions/${id}`).subscribe({
      next: (rx) => {
        this.rx.set(rx);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatDate(value: string): string {
    return value ? new Date(value).toLocaleDateString() : '—';
  }
}