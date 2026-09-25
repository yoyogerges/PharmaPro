import { Component, inject, signal, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Banknote, TrendingUp, ShoppingCart, Wallet, ReceiptText, Truck, Users, FileText, AlertTriangle, Package, Clock, CalendarX2 } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';

type ChartRange = 'week' | 'month' | 'year';
type Period = 'today' | 'week' | 'month';

interface ChartBucket {
  label: string;
  count: number;
  amount: number;
  profit: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe, TranslatePipe, LucideAngularModule, FormsModule, RouterModule, PageHeaderComponent, StatCardComponent],
  template: `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header
          [title]="('DASHBOARD.title' | translate)"
          [crumbs]="[('DASHBOARD.title' | translate)]"
          [subtitle]="('DASHBOARD.welcome' | translate) + '، ' + todayLabel"
        />
      </div>

      @if (summary()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <app-stat-card [label]="('DASHBOARD.total_sales' | translate)" [value]="fmt(summary()!.today.salesAmount)" [sub]="summary()!.today.salesCount + ' ' + ('DASHBOARD.sales_count' | translate)" [icon]="Banknote" tone="emerald" />
          <app-stat-card [label]="('DASHBOARD.profit' | translate)" [value]="fmt(summary()!.today.profit)" [icon]="TrendingUp" tone="violet" />
          <app-stat-card [label]="('DASHBOARD.avg_order' | translate)" [value]="fmt(summary()!.today.avgOrderValue)" [icon]="ShoppingCart" tone="blue" />
          <app-stat-card [label]="('DASHBOARD.unpaid' | translate)" [value]="fmt(summary()!.today.unpaidAmount)" [sub]="summary()!.today.unpaidInvoices + ' ' + ('DASHBOARD.unpaid_invoices' | translate)" [icon]="Wallet" tone="amber" />
          <app-stat-card [label]="('DASHBOARD.expenses' | translate)" [value]="fmt(summary()!.today.expensesAmount)" [icon]="ReceiptText" tone="red" />
          <app-stat-card [label]="('DASHBOARD.purchases' | translate)" [value]="fmt(summary()!.today.purchaseAmount)" [icon]="Truck" tone="blue" />
          <app-stat-card [label]="('DASHBOARD.new_customers' | translate)" [value]="summary()!.today.newCustomers" [icon]="Users" tone="emerald" />
          <app-stat-card [label]="('DASHBOARD.prescriptions' | translate)" [value]="summary()!.today.prescriptionCount" [icon]="FileText" tone="violet" />
        </div>
      }

      <div class="grid gap-4 lg:grid-cols-3">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'DASHBOARD.sales_chart' | translate }}</h3>
            <div class="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              @for (range of ranges; track range) {
                <button
                  type="button"
                  (click)="setRange(range)"
                  class="rounded-md px-3 py-1 text-xs font-semibold transition"
                  [class.bg-white]="chartRange() === range"
                  [class.shadow-sm]="chartRange() === range"
                  [class.text-slate-700]="chartRange() === range"
                  [class.text-slate-500]="chartRange() !== range"
                  [class.dark:bg-slate-700]="chartRange() === range"
                  [class.dark:text-slate-100]="chartRange() === range"
                >
                  {{ 'DASHBOARD.period_' + range | translate }}
                </button>
              }
            </div>
          </div>
          @if (chart().length > 0) {
            <div class="flex h-48 items-end gap-1.5 sm:gap-2">
              @for (bucket of chart(); track bucket.label) {
                <div class="group flex flex-1 flex-col items-center gap-1">
                  <div class="relative flex w-full flex-1 items-end justify-center">
                    <div
                      class="w-full rounded-t-lg transition-all"
                      [style.height.%]="barHeight(bucket.amount)"
                      [class.bg-primary-500]="bucket.amount > 0"
                      [class.bg-slate-100]="bucket.amount === 0"
                      [class.dark:bg-slate-800]="bucket.amount === 0"
                      [title]="bucket.label + ': ' + bucket.amount"
                    ></div>
                    <span class="pointer-events-none absolute -top-5 whitespace-nowrap rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                      {{ bucket.amount | number: '1.2' }}
                    </span>
                  </div>
                  <span class="text-[9px] text-slate-400 sm:text-[10px]">{{ bucket.label.slice(5) }}</span>
                </div>
              }
            </div>
          } @else {
            <p class="py-16 text-center text-sm text-slate-400">{{ 'DASHBOARD.no_data' | translate }}</p>
          }
        </section>

        <aside class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'DASHBOARD.alerts' | translate }}</h3>
          @if (alertsLoading()) {
            <p class="text-sm text-slate-400">{{ 'COMMON.loading' | translate }}</p>
          } @else if (alerts()) {
            <div class="space-y-3">
              <a routerLink="/inventory" class="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-900/20">
                <span class="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
                  <lucide-angular [img]="Package" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.low_stock_products' | translate }}
                </span>
                <span class="font-bold text-amber-700 dark:text-amber-300">{{ alerts()!.lowStock.length }}</span>
              </a>
              <a routerLink="/inventory/expiry" class="flex items-center justify-between rounded-xl bg-sky-50 px-4 py-3 text-sm dark:bg-sky-900/20">
                <span class="flex items-center gap-2 font-medium text-sky-800 dark:text-sky-200">
                  <lucide-angular [img]="Clock" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.expiring_soon' | translate }}
                </span>
                <span class="font-bold text-sky-700 dark:text-sky-300">{{ alerts()!.expiring.length }}</span>
              </a>
              <a routerLink="/inventory/expiry" class="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm dark:bg-red-900/20">
                <span class="flex items-center gap-2 font-medium text-red-800 dark:text-red-200">
                  <lucide-angular [img]="CalendarX2" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.expired_products' | translate }}
                </span>
                <span class="font-bold text-red-700 dark:text-red-300">{{ alerts()!.expired.length }}</span>
              </a>
              <a routerLink="/expenses" class="flex items-center justify-between rounded-xl bg-violet-50 px-4 py-3 text-sm dark:bg-violet-900/20">
                <span class="flex items-center gap-2 font-medium text-violet-800 dark:text-violet-200">
                  <lucide-angular [img]="ReceiptText" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.pending_expenses' | translate }}
                </span>
                <span class="font-bold text-violet-700 dark:text-violet-300">{{ alerts()!.pendingExpenses }}</span>
              </a>
              <a routerLink="/inventory/adjustments" class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
                <span class="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <lucide-angular [img]="AlertTriangle" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.pending_adjustments' | translate }}
                </span>
                <span class="font-bold text-slate-600 dark:text-slate-300">{{ alerts()!.pendingAdjustments }}</span>
              </a>
              <a routerLink="/purchase-orders" class="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/50">
                <span class="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                  <lucide-angular [img]="Truck" class="h-4 w-4"></lucide-angular>
                  {{ 'DASHBOARD.pending_pos' | translate }}
                </span>
                <span class="font-bold text-slate-600 dark:text-slate-300">{{ alerts()!.pendingApprovalPOs }}</span>
              </a>
            </div>
          }
        </aside>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <section class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'DASHBOARD.top_products' | translate }}</h3>
            <select [ngModel]="productPeriod()" (ngModelChange)="setProductPeriod($event)" class="form-input w-auto py-1 text-xs">
              @for (period of periods; track period) {
                <option [value]="period">{{ 'DASHBOARD.period_' + period | translate }}</option>
              }
            </select>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th class="pb-2 font-semibold">{{ 'DASHBOARD.product' | translate }}</th>
                <th class="pb-2 text-end font-semibold">{{ 'DASHBOARD.sold_qty' | translate }}</th>
                <th class="pb-2 text-end font-semibold">{{ 'DASHBOARD.revenue' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (product of topProducts(); track product.product) {
                <tr class="border-b border-slate-50 last:border-0 dark:border-slate-800/50">
                  <td class="py-2.5 font-medium text-slate-800 dark:text-slate-100">{{ product.product }}</td>
                  <td class="py-2.5 text-end text-slate-500">{{ product.quantity }}</td>
                  <td class="py-2.5 text-end font-semibold text-slate-800 dark:text-slate-100">{{ product.revenue | number: '1.2-2' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="py-8 text-center text-sm text-slate-400">{{ 'DASHBOARD.no_data' | translate }}</td></tr>
              }
            </tbody>
          </table>
        </section>

        <section class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'DASHBOARD.category_chart' | translate }}</h3>
          @if (categories().length > 0) {
            <div class="space-y-3">
              @for (cat of categories().slice(0, 8); track cat.category) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-sm">
                    <span class="font-medium text-slate-700 dark:text-slate-200">{{ cat.category }}</span>
                    <span class="text-slate-500">{{ cat.revenue | number: '1.2-2' }}</span>
                  </div>
                  <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div class="h-full rounded-full bg-primary-500 transition-all" [style.width.%]="categoryPercent(cat.revenue)"></div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="py-16 text-center text-sm text-slate-400">{{ 'DASHBOARD.no_data' | translate }}</p>
          }
        </section>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);

  readonly ranges: ChartRange[] = ['week', 'month', 'year'];
  readonly periods: Period[] = ['today', 'week', 'month'];

  readonly summary = signal<any>(null);
  readonly chart = signal<ChartBucket[]>([]);
  readonly chartRange = signal<ChartRange>('week');
  readonly topProducts = signal<any[]>([]);
  readonly productPeriod = signal<Period>('month');
  readonly categories = signal<any[]>([]);
  readonly alerts = signal<any>(null);
  readonly alertsLoading = signal(true);

  protected readonly numberLocale = 'en-US';

  protected fmt(value: unknown): string {
    if (typeof value !== 'number') return String(value ?? '—');
    return new Intl.NumberFormat(this.numberLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  protected readonly Banknote = Banknote;
  protected readonly TrendingUp = TrendingUp;
  protected readonly ShoppingCart = ShoppingCart;
  protected readonly Wallet = Wallet;
  protected readonly ReceiptText = ReceiptText;
  protected readonly Truck = Truck;
  protected readonly Users = Users;
  protected readonly FileText = FileText;
  protected readonly AlertTriangle = AlertTriangle;
  protected readonly Package = Package;
  protected readonly Clock = Clock;
  protected readonly CalendarX2 = CalendarX2;

  readonly todayLabel = new Date().toLocaleDateString();

  readonly maxChart = computed(() => Math.max(...this.chart().map((b) => b.amount), 0));
  readonly maxCategory = computed(() => Math.max(...this.categories().map((c) => c.revenue), 0));

  barHeight(amount: number): number {
    return this.maxChart() > 0 ? Math.max((amount / this.maxChart()) * 100, 2) : 2;
  }

  categoryPercent(revenue: number): number {
    return this.maxCategory() > 0 ? Math.round((revenue / this.maxCategory()) * 100) : 0;
  }

  setRange(range: ChartRange) {
    this.chartRange.set(range);
    this.loadChart();
  }

  setProductPeriod(period: Period) {
    this.productPeriod.set(period);
    this.loadTopProducts();
  }

  ngOnInit() {
    this.api.get<any>('/dashboard/summary').subscribe({ next: (res) => this.summary.set(res) });
    this.loadChart();
    this.loadTopProducts();
    this.api.get<any>('/dashboard/categories').subscribe({ next: (res) => this.categories.set(res) });
    this.api.get<any>('/dashboard/alerts').subscribe({ next: (res) => this.alerts.set(res), complete: () => this.alertsLoading.set(false), error: () => this.alertsLoading.set(false) });
  }

  private loadChart() {
    this.api.get<any[]>('/dashboard/sales-chart', { range: this.chartRange() }).subscribe({ next: (res) => this.chart.set(res) });
  }

  private loadTopProducts() {
    this.api.get<any[]>('/dashboard/top-products', { period: this.productPeriod(), limit: 5 }).subscribe({ next: (res) => this.topProducts.set(res) });
  }
}