import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, Barcode, Banknote, Check, Minus, Plus, Printer, RotateCcw, Search, Trash2, Wallet, X } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PharmacyCurrencyPipe } from '@shared/pipes/pharmacy-currency.pipe';

interface PosProduct {
  id: string;
  name: string;
  nameAr?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  sellingPrice: number;
  taxRate: number;
  stockQuantity: number;
  prescriptionRequired: boolean;
}

interface BatchOption {
  value: string;
  label: string;
  qty: number;
}

interface CartLine {
  productId: string;
  name: string;
  sku?: string | null;
  unit: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  maxStock: number;
  batchId: string;
  batchOptions: BatchOption[];
  prescriptionRequired: boolean;
}

interface PaymentRow {
  method: string;
  amount: number;
}

interface ReturnedSale {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  taxAmount: number;
  subtotal: number;
  discountAmount: number;
  paymentStatus: string;
  status: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, LucideAngularModule, PharmacyCurrencyPipe],
  template: `
    <div class="flex h-full flex-col">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-3">
          <a routerLink="/dashboard" class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-600 dark:hover:bg-slate-800" [attr.title]="('POS.back_dashboard' | translate)">
            <lucide-angular [img]="ArrowLeft" class="h-5 w-5"></lucide-angular>
          </a>
          <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ 'POS.title' | translate }}</h1>
        </div>
        <div class="flex items-center gap-2">
          <lucide-angular [img]="Barcode" class="h-5 w-5 text-slate-400"></lucide-angular>
          <span class="hidden text-xs text-slate-500 sm:block">{{ 'POS.scan_hint' | translate }}</span>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 gap-4 p-4">
        <section class="flex min-w-0 flex-1 flex-col gap-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="relative">
              <lucide-angular [img]="Search" class="absolute start-3 top-2.5 h-4 w-4 text-slate-400"></lucide-angular>
              <input
                [(ngModel)]="searchTerm"
                (ngModelChange)="onSearchTyped()"
                type="text"
                placeholder="{{ 'POS.search_placeholder' | translate }}"
                class="form-input ps-9"
              />
            </div>
            <div class="relative">
              <lucide-angular [img]="Barcode" class="absolute start-3 top-2.5 h-4 w-4 text-slate-400"></lucide-angular>
              <input
                [(ngModel)]="barcodeTerm"
                (keydown.enter)="addByBarcode()"
                type="text"
                placeholder="{{ 'POS.barcode_placeholder' | translate }}"
                class="form-input ps-9"
              />
            </div>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto">
            @if (loadingProducts()) {
              <div class="flex h-full items-center justify-center">
                <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
              </div>
            } @else if (products().length === 0) {
              <div class="flex h-full flex-col items-center justify-center text-center">
                <lucide-angular [img]="Search" class="mb-3 h-10 w-10 text-slate-300"></lucide-angular>
                <p class="text-sm text-slate-400">{{ 'POS.no_products' | translate }}</p>
              </div>
            } @else {
              <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                @for (product of products(); track product.id) {
                  <button
                    type="button"
                    (click)="addProduct(product)"
                    [disabled]="product.stockQuantity <= 0"
                    class="flex flex-col items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-sm transition hover:border-primary-300 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700"
                  >
                    <div class="flex w-full items-start justify-between gap-2">
                      <h3 class="line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ product.name }}</h3>
                      <div class="flex shrink-0 items-center gap-1">
                        @if (product.prescriptionRequired) {
                          <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" [attr.title]="('POS.rx_required' | translate)">Rx</span>
                        }
                        @if (product.sku) {
                          <span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800">{{ product.sku }}</span>
                        }
                      </div>
                    </div>
                    <div class="flex w-full items-center justify-between gap-2">
                      <span class="text-base font-bold text-primary-600 dark:text-primary-400">{{ product.sellingPrice | pharmacyCurrency }}</span>
                      <span
                        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        [class]="product.stockQuantity <= 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'"
                      >
                        {{ product.stockQuantity <= 0 ? ('POS.out_of_stock' | translate) : product.stockQuantity + ' ' + product.unit }}
                      </span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>
        </section>

        <aside class="flex w-full max-w-sm shrink-0 flex-col gap-3 lg:w-96">
          <div class="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ 'POS.cart' | translate }}</h2>
              @if (cart().length > 0) {
                <button type="button" (click)="clearCart()" class="inline-flex items-center gap-1 rounded-md p-1.5 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800">
                  <lucide-angular [img]="RotateCcw" class="h-3.5 w-3.5"></lucide-angular>
                </button>
              }
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto p-3">
              @if (cart().length === 0) {
                <div class="flex h-full flex-col items-center justify-center text-center">
                  <lucide-angular [img]="Wallet" class="mb-2 h-8 w-8 text-slate-300"></lucide-angular>
                  <p class="text-xs text-slate-400">{{ 'POS.cart_empty' | translate }}</p>
                </div>
              } @else {
                <ul class="space-y-3">
                  @for (line of cart(); track line.productId; let i = $index) {
                    <li class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{{ line.name }}</p>
                          @if (line.sku) {
                            <p class="text-[11px] text-slate-400">{{ line.sku }}</p>
                          }
                          @if (line.prescriptionRequired) {
                            <span class="mt-1 inline-flex rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              {{ 'POS.rx_required' | translate }}
                            </span>
                          }
                        </div>
                        <button type="button" (click)="removeLine(i)" class="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                          <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                        </button>
                      </div>

                      <div class="mt-2 grid grid-cols-2 gap-2">
                        <div class="flex items-center justify-between rounded-lg border border-slate-200 px-2 py-1 dark:border-slate-700">
                          <button type="button" (click)="decrement(i)" class="rounded p-0.5 text-slate-500 transition hover:text-primary-600">-</button>
                          <span class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ line.quantity }}</span>
                          <button type="button" (click)="increment(i)" class="rounded p-0.5 text-slate-500 transition hover:text-primary-600">+</button>
                        </div>
                        <select
                          [ngModel]="line.batchId"
                          (ngModelChange)="onBatchChange(i, $event)"
                          class="form-input truncate py-1 text-xs"
                          [title]="('POS.batch' | translate)"
                        >
                          @for (option of line.batchOptions; track option.value) {
                            <option [value]="option.value">{{ option.label }}</option>
                          }
                        </select>
                      </div>

                      <div class="mt-2 flex items-center justify-between">
                        <input
                          [ngModel]="line.unitPrice"
                          (ngModelChange)="updatePrice(i, $event)"
                          type="number"
                          min="0"
                          step="0.01"
                          class="form-input w-24 py-1 text-right text-xs"
                        />
                        <span class="text-sm font-bold text-primary-600 dark:text-primary-400">{{ r2(line.unitPrice * line.quantity) | pharmacyCurrency }}</span>
                      </div>
                    </li>
                  }
                </ul>
              }
            </div>

            <div class="space-y-1.5 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ 'POS.subtotal' | translate }}</span>
                <span>{{ subtotal() | pharmacyCurrency }}</span>
              </div>
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ 'POS.tax' | translate }}</span>
                <span>{{ tax() | pharmacyCurrency }}</span>
              </div>
              <div class="flex justify-between text-base font-bold text-slate-800 dark:text-slate-100">
                <span>{{ 'POS.total' | translate }}</span>
                <span>{{ total() | pharmacyCurrency }}</span>
              </div>
              @if (hasRxItems()) {
                <p class="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {{ 'POS.rx_warning' | translate }}
                </p>
              }
              <button
                type="button"
                (click)="openPayment()"
                [disabled]="cart().length === 0"
                class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
              >
                <lucide-angular [img]="Banknote" class="h-4 w-4"></lucide-angular>
                {{ 'POS.checkout' | translate }}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    @if (paymentOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div class="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-card dark:bg-slate-900">
          <div class="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
            <h2 class="text-base font-bold text-slate-800 dark:text-slate-100">{{ 'POS.payment' | translate }}</h2>
            <button type="button" (click)="closePayment()" class="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>

          <div class="space-y-4 p-5">
            <div class="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div class="flex justify-between text-sm text-slate-500">
                <span>{{ 'POS.total' | translate }}</span>
                <span class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ total() | pharmacyCurrency }}</span>
              </div>
              <div class="mt-1 flex justify-between text-sm text-slate-500">
                <span>{{ 'POS.paid' | translate }}</span>
                <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ paidTotal() | pharmacyCurrency }}</span>
              </div>
              <div class="mt-1 flex justify-between text-sm text-slate-500">
                <span>{{ 'POS.change' | translate }}</span>
                <span class="font-semibold text-primary-600 dark:text-primary-400">{{ change() | pharmacyCurrency }}</span>
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-medium text-slate-500">{{ 'POS.customer' | translate }}</label>
              <select [ngModel]="customerId" (ngModelChange)="customerId = $event" class="form-input">
                <option value="">{{ 'COMMON.none' | translate }}</option>
                @for (option of customerOptions(); track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>

            <div class="space-y-2">
              <label class="block text-xs font-medium text-slate-500">{{ 'POS.payments' | translate }}</label>
              @for (row of payments(); track $index; let i = $index) {
                <div class="flex items-center gap-2">
                  <select [(ngModel)]="row.method" class="form-input w-40 py-2 text-sm">
                    @for (method of paymentMethods; track method) {
                      <option [value]="method">{{ 'ENUMS.' + method | translate }}</option>
                    }
                  </select>
                  <input [ngModel]="row.amount" (ngModelChange)="onPaymentAmount(i, $event)" type="number" min="0" step="0.01" class="form-input flex-1 text-right" (click)="focusedPayment = i" />
                  @if (payments().length > 1) {
                    <button type="button" (click)="removePayment(i)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                      <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                    </button>
                  }
                </div>
              }
              <div class="flex flex-wrap gap-1.5">
                <button type="button" (click)="setExact()" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                  {{ 'POS.exact' | translate }}
                </button>
                @for (amount of quickAmounts(); track amount) {
                  <button type="button" (click)="setQuick(amount)" class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-primary-50 dark:border-slate-700 dark:text-slate-300">
                    {{ amount }}
                  </button>
                }
                <button type="button" (click)="addPayment()" class="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-50 dark:border-primary-800">
                  <lucide-angular [img]="Plus" class="h-3.5 w-3.5"></lucide-angular>
                  {{ 'POS.add_payment' | translate }}
                </button>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-1.5">
              @for (key of numpadKeys(); track key) {
                <button type="button" (click)="pressKey(key)" class="rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                  {{ key }}
                </button>
              }
            </div>

            <div class="flex justify-end gap-2">
              <button type="button" (click)="closePayment()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
                {{ 'COMMON.cancel' | translate }}
              </button>
              <button
                type="button"
                (click)="submitSale()"
                [disabled]="saving() || paidTotal() < total() - 0.005"
                class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
              >
                <lucide-angular [img]="Check" class="h-4 w-4"></lucide-angular>
                {{ 'POS.pay' | translate }} · {{ total() | pharmacyCurrency }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (lastSale()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div class="max-h-full w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 text-center shadow-card dark:bg-slate-900">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <lucide-angular [img]="Check" class="h-7 w-7 text-emerald-600 dark:text-emerald-400"></lucide-angular>
          </div>
          <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ 'POS.sale_completed' | translate }}</h2>
          <p class="mt-1 text-sm text-slate-500">{{ lastSale()!.invoiceNumber }}</p>
          <div class="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-4 text-start text-sm dark:bg-slate-800">
            <div class="flex justify-between text-slate-500"><span>{{ 'POS.total' | translate }}</span><span>{{ lastSale()!.totalAmount | pharmacyCurrency }}</span></div>
            <div class="flex justify-between text-slate-500"><span>{{ 'POS.paid' | translate }}</span><span>{{ lastSale()!.paidAmount | pharmacyCurrency }}</span></div>
            <div class="flex justify-between font-semibold text-slate-800 dark:text-slate-100"><span>{{ 'POS.change' | translate }}</span><span>{{ lastSale()!.changeAmount | pharmacyCurrency }}</span></div>
          </div>
          <div class="mt-5 flex flex-col gap-2">
            <button type="button" routerLink="/sales/{{ lastSale()!.id }}/receipt" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
              <lucide-angular [img]="Printer" class="h-4 w-4"></lucide-angular>
              {{ 'POS.view_receipt' | translate }}
            </button>
            <button type="button" (click)="resetSale()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'POS.new_sale' | translate }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PosComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly paymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'];

  readonly products = signal<PosProduct[]>([]);
  readonly cart = signal<CartLine[]>([]);
  readonly customerOptions = signal<{ value: string; label: string }[]>([]);
  readonly loadingProducts = signal(true);
  readonly paymentOpen = signal(false);
  readonly saving = signal(false);
  readonly lastSale = signal<ReturnedSale | null>(null);
  customerId = '';

  searchTerm = '';
  barcodeTerm = '';
  focusedPayment = 0;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly payments = signal<PaymentRow[]>([{ method: 'CASH', amount: 0 }]);

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly Barcode = Barcode;
  protected readonly Plus = Plus;
  protected readonly Minus = Minus;
  protected readonly Trash2 = Trash2;
  protected readonly Search = Search;
  protected readonly Check = Check;
  protected readonly X = X;
  protected readonly Wallet = Wallet;
  protected readonly Banknote = Banknote;
  protected readonly Printer = Printer;
  protected readonly RotateCcw = RotateCcw;

  ngOnInit() {
    this.search('');
    this.api.get<any[]>('/customers/options').subscribe({
      next: (list) => this.customerOptions.set(list.map((c) => ({ value: c.id, label: c.name }))),
      error: () => undefined,
    });
  }

  protected readonly r2 = r2;

  subtotal() {
    return r2(this.cart().reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  }

  tax() {
    return r2(this.cart().reduce((sum, line) => sum + (line.quantity * line.unitPrice * line.taxRate) / 100, 0));
  }

  total() {
    return r2(this.subtotal() + this.tax());
  }

  paidTotal() {
    return r2(this.payments().reduce((sum, row) => sum + Number(row.amount || 0), 0));
  }

  change() {
    return r2(Math.max(0, this.paidTotal() - this.total()));
  }

  quickAmounts(): number[] {
    const total = this.total();
    const needs = Math.ceil(total / 10) * 10;
    const set = new Set<number>([needs + 5]);
    for (let i = 1; i <= 5; i++) {
      const rounded = Math.ceil(total / i) * i;
      if (rounded > total) set.add(rounded);
    }
    return [...set].sort((a, b) => a - b).slice(0, 4);
  }

  numpadKeys(): string[] {
    return ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '00', 'C'];
  }

  onSearchTyped() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.search(this.searchTerm), 350);
  }

  addByBarcode() {
    const code = this.barcodeTerm.trim();
    if (!code) return;
    this.api.get<PosProduct>(`/pos/barcode/${encodeURIComponent(code)}`).subscribe({
      next: (product) => {
        this.barcodeTerm = '';
        this.addProduct(product);
        this.notifications.info('POS.barcode_added');
      },
      error: () => {
        this.notifications.error('POS.barcode_not_found');
      },
    });
  }

  addProduct(product: PosProduct) {
    const lines = this.cart();
    const existing = lines.find((line) => line.productId === product.id);
    if (existing) {
      if (existing.quantity >= existing.maxStock) {
        this.notifications.warning('POS.stock_limit');
        return;
      }
      this.cart.update((list) => list.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line)));
      return;
    }
    const line: CartLine = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      unitPrice: product.sellingPrice,
      taxRate: product.taxRate,
      quantity: 1,
      maxStock: Math.max(1, product.stockQuantity),
      batchId: '',
      batchOptions: [{ value: '', label: this.translate.instant('POS.auto_batch'), qty: Math.max(1, product.stockQuantity) }],
      prescriptionRequired: product.prescriptionRequired,
    };
    this.cart.update((list) => [...list, line]);
    this.loadBatches(product.id);
  }

  loadBatches(productId: string) {
    this.api.get<any[]>('/batches/product/' + productId).subscribe({
      next: (list) => {
        this.cart.update((lines) =>
          lines.map((line) => {
            if (line.productId !== productId) return line;
            const options: BatchOption[] = [{ value: '', label: this.translate.instant('POS.auto_batch'), qty: line.maxStock }];
            for (const batch of list) {
              options.push({ value: batch.id, label: `${batch.batchNumber} · ${batch.remainingQuantity} ${line.unit}`, qty: batch.remainingQuantity });
            }
            return { ...line, batchOptions: options };
          }),
        );
      },
      error: () => undefined,
    });
  }

  onBatchChange(i: number, value: string) {
    this.cart.update((lines) => {
      const line = lines[i];
      const option = line.batchOptions.find((o) => o.value === value);
      const maxStock = Math.max(1, option?.qty ?? line.maxStock);
      return lines.map((l, idx) => (idx === i ? { ...l, batchId: value, quantity: Math.min(l.quantity, maxStock), maxStock } : l));
    });
  }

  increment(i: number) {
    this.cart.update((lines) => lines.map((line, idx) => (idx === i && line.quantity < line.maxStock ? { ...line, quantity: line.quantity + 1 } : line)));
  }

  decrement(i: number) {
    this.cart.update((lines) => lines.map((line, idx) => (idx === i && line.quantity > 1 ? { ...line, quantity: line.quantity - 1 } : line)));
  }

  updatePrice(i: number, value: string) {
    const parsed = Number(value);
    this.cart.update((lines) => lines.map((line, idx) => (idx === i ? { ...line, unitPrice: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 } : line)));
  }

  removeLine(i: number) {
    this.cart.update((lines) => lines.filter((_, idx) => idx !== i));
  }

  clearCart() {
    this.cart.set([]);
  }

  hasRxItems(): boolean {
    return this.cart().some((line) => line.prescriptionRequired);
  }

  openPayment() {
    if (this.cart().length === 0) return;
    this.payments.set([{ method: 'CASH', amount: 0 }]);
    this.focusedPayment = 0;
    this.paymentOpen.set(true);
  }

  closePayment() {
    this.paymentOpen.set(false);
  }

  addPayment() {
    this.payments.update((rows) => [...rows, { method: 'CASH', amount: 0 }]);
  }

  removePayment(i: number) {
    this.payments.update((rows) => rows.filter((_, idx) => idx !== i));
  }

  setExact() {
    this.payments.update((rows) => rows.map((row, idx) => (idx === 0 ? { ...row, amount: r2(this.total()) } : row)));
  }

  setQuick(amount: number) {
    this.payments.update((rows) => rows.map((row, idx) => (idx === 0 ? { ...row, amount } : row)));
  }

  onPaymentAmount(i: number, value: string) {
    this.focusedPayment = i;
    const parsed = Number(value);
    this.payments.update((rows) => rows.map((row, idx) => (idx === i ? { ...row, amount: Number.isFinite(parsed) ? parsed : 0 } : row)));
  }

  pressKey(key: string) {
    const rows = this.payments();
    if (rows.length === 0) return;
    const current = `${rows[this.focusedPayment]?.amount ?? ''}`;
    let next: string;
    if (key === 'C') {
      next = '';
    } else if (key === '00') {
      next = current ? current + '00' : '0';
    } else if (key === '0') {
      next = current ? current + '0' : '0';
    } else {
      const base = current === '0' ? '' : current;
      next = base + key;
    }
    this.payments.update((list) => list.map((row, idx) => (idx === this.focusedPayment ? { ...row, amount: Number(next || 0) } : row)));
  }

  submitSale() {
    const paid = this.paidTotal();
    const total = this.total();
    if (paid < total - 0.005) {
      this.notifications.warning('POS.insufficient_payment');
      return;
    }
    const payload = {
      customerId: this.customerId || undefined,
      items: this.cart().map((line) => ({
        productId: line.productId,
        batchId: line.batchId || undefined,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
      })),
      payments: this.payments()
        .filter((row) => row.amount > 0)
        .map((row) => ({ method: row.method, amount: r2(row.amount) })),
      notes: undefined,
    };
    this.saving.set(true);
    this.api.post<ReturnedSale>('/pos/sale', payload).subscribe({
      next: (sale) => {
        this.saving.set(false);
        this.paymentOpen.set(false);
        this.lastSale.set(sale);
        this.cart.set([]);
        this.barcodeTerm = '';
        this.notifications.success('POS.sale_completed');
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  resetSale() {
    this.lastSale.set(null);
  }

  private search(term: string) {
    this.loadingProducts.set(true);
    this.api
      .get<PosProduct[]>('/pos/product-search', term.trim() ? { q: term.trim() } : {})
      .subscribe({
        next: (list) => {
          this.products.set(list);
          this.loadingProducts.set(false);
        },
        error: () => this.loadingProducts.set(false),
      });
  }
}