import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import {
  LucideAngularModule,
  AlertTriangle,
  Bell,
  CalendarX,
  Check,
  CheckCheck,
  CircleAlert,
  ClipboardCheck,
  Clock,
  Info,
  Package,
  RefreshCw,
  Server,
  Truck,
  type LucideIconData,
} from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  titleAr?: string | null;
  message: string;
  messageAr?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, LucideIconData> = {
  LOW_STOCK: Package,
  NEAR_EXPIRY: Clock,
  EXPIRED: CalendarX,
  PENDING_APPROVAL: ClipboardCheck,
  PURCHASE_REQUEST: Truck,
  SYSTEM: Server,
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: CircleAlert,
};

const TYPE_COLORS: Record<string, string> = {
  LOW_STOCK: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  NEAR_EXPIRY: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  EXPIRED: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  PENDING_APPROVAL: 'bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  PURCHASE_REQUEST: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  SYSTEM: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  INFO: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  WARNING: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  ERROR: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [DatePipe, TranslatePipe, LucideAngularModule, PageHeaderComponent, EmptyStateComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header
          [title]="('NOTIFICATIONS.title' | translate)"
          [crumbs]="[('NAV.notifications' | translate)]"
          [subtitle]="('NOTIFICATIONS.description' | translate)"
        />
        <div class="flex items-center gap-2">
          @if (unread() > 0) {
            <button
              type="button"
              [disabled]="busy()"
              (click)="markAllRead()"
              class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
            >
              <lucide-angular [img]="CheckCheck" class="h-4 w-4"></lucide-angular>
              {{ 'NOTIFICATIONS.mark_all_read' | translate }}
            </button>
          }
          <button
            type="button"
            (click)="load()"
            class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <lucide-angular [img]="RefreshCw" class="h-4 w-4"></lucide-angular>
            {{ 'COMMON.refresh' | translate }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <p class="text-sm text-slate-400">{{ 'COMMON.loading' | translate }}</p>
      } @else if (items().length === 0) {
        <app-empty-state [title]="'NOTIFICATIONS.empty_title'" [message]="'NOTIFICATIONS.empty_message'" />
      } @else {
        <div class="space-y-2">
          @for (item of items(); track item.id) {
            <button
              type="button"
              (click)="open(item)"
              [disabled]="busy()"
              class="flex w-full items-start gap-3 rounded-2xl border p-4 text-start transition disabled:opacity-60"
              [class.border-slate-200]="item.isRead"
              [class.bg-white]="item.isRead"
              [class.border-primary-300]="!item.isRead"
              [class.bg-primary-50/60]="!item.isRead"
              [class.dark:border-slate-800]="item.isRead"
              [class.dark:bg-slate-900]="item.isRead"
              [class.dark:border-primary-700]="!item.isRead"
              [class.dark:bg-primary-900/20]="!item.isRead"
            >
              <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" [class]="iconClass(item.type)">
                <lucide-angular [img]="iconFor(item.type)" class="h-4 w-4"></lucide-angular>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {{ item.title }}
                    @if (!item.isRead) {
                      <span class="ms-2 inline-block h-2 w-2 rounded-full bg-primary-500"></span>
                    }
                  </p>
                  <span class="shrink-0 text-xs text-slate-400">{{ item.createdAt | date: 'dd MMM yyyy, HH:mm' }}</span>
                </div>
                <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{{ item.message }}</p>
                @if (item.entityType && item.entityId) {
                  <p class="mt-1 font-mono text-[11px] text-slate-400">{{ item.entityType }} · {{ item.entityId }}</p>
                }
              </div>
              @if (!item.isRead) {
                <span class="mt-1 inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[11px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  <lucide-angular [img]="Check" class="h-3 w-3"></lucide-angular>
                  {{ 'NOTIFICATIONS.unread' | translate }}
                </span>
              }
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly items = signal<NotificationItem[]>([]);
  readonly unread = signal(0);

  protected readonly Bell = Bell;
  protected readonly Check = Check;
  protected readonly CheckCheck = CheckCheck;
  protected readonly RefreshCw = RefreshCw;

  ngOnInit() {
    this.load();
  }

  iconFor(type: string): LucideIconData {
    return TYPE_ICONS[type] ?? Bell;
  }

  iconClass(type: string): string {
    return TYPE_COLORS[type] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  load() {
    this.loading.set(true);
    this.api.get<PaginatedData<NotificationItem>>('/notifications', { limit: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.unread.set(res.items.filter((item) => !item.isRead).length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(item: NotificationItem) {
    this.markRead(item);
    const route = this.targetRoute(item);
    if (route) this.router.navigate(route);
  }

  private targetRoute(item: NotificationItem): string[] | null {
    const id = item.entityId;
    const hasValidId = !!id && !/^0{8}-/.test(id) && id.length >= 8;
    switch (item.entityType) {
      case 'Product':
        return ['/products'];
      case 'Batch':
        return hasValidId ? ['/batches', id] : ['/batches'];
      case 'PurchaseOrder':
        return hasValidId ? ['/purchase-orders', id] : ['/purchase-orders'];
      case 'PurchaseReceipt':
        return ['/purchase-receipts'];
      case 'Customer':
        return ['/customers'];
      case 'Supplier':
        return ['/suppliers'];
      case 'Sale':
        return hasValidId ? ['/sales', id] : ['/sales'];
      case 'Prescription':
        return hasValidId ? ['/prescriptions', id] : ['/prescriptions'];
      case 'Payment':
        return ['/payments'];
      default:
        return null;
    }
  }

  markRead(item: NotificationItem) {
    if (item.isRead) return;
    this.busy.set(true);
    this.api.patch<{ success: boolean }>(`/notifications/${item.id}/read`).subscribe({
      next: () => {
        item.isRead = true;
        this.unread.update((count) => Math.max(0, count - 1));
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.notifications.error('COMMON.errors.operation_failed');
      },
    });
  }

  markAllRead() {
    this.busy.set(true);
    this.api.patch<{ success: boolean }>('/notifications/read-all').subscribe({
      next: () => {
        this.items.update((all) => all.map((item) => ({ ...item, isRead: true })));
        this.unread.set(0);
        this.busy.set(false);
      },
      error: () => {
        this.busy.set(false);
        this.notifications.error('COMMON.errors.operation_failed');
      },
    });
  }
}