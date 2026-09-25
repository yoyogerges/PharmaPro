import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Scale, LoaderCircle } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import type { SelectOption } from '@shared/components/select-search/select-search.component';

interface MovementRow {
  type: string;
  amount: number;
  reference: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, DecimalPipe, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('CASH_REGISTER.title' | translate)" [crumbs]="[('NAV.cash_register' | translate)]" />

      @if (loading()) {
        <div class="flex justify-center py-16">
          <lucide-angular [img]="LoaderCircle" class="h-8 w-8 animate-spin text-slate-400"></lucide-angular>
        </div>
      } @else if (!hasRegisters()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ 'CASH_REGISTER.no_register' | translate }}</p>
        </div>
      } @else if (!summary() || !session()) {
        <div class="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ 'CASH_REGISTER.no_session' | translate }}</p>
        </div>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p class="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{{ 'CASH_REGISTER.opening_balance' | translate }}</p>
            <p class="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-50">{{ session().openingBalance | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 dark:border-sky-900 dark:bg-sky-950/30">
            <p class="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">{{ 'CASH_REGISTER.inflow' | translate }}</p>
            <p class="mt-2 text-2xl font-bold text-sky-900 dark:text-sky-50">{{ summary().totals.inflow | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
            <p class="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">{{ 'CASH_REGISTER.outflow' | translate }}</p>
            <p class="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-50">{{ summary().totals.outflow | number: '1.2-2' }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">{{ 'CASH_REGISTER.expected' | translate }}</p>
            <p class="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">{{ summary().expectedClosingBalance | number: '1.2-2' }}</p>
          </div>
        </div>

        @if (isOpen()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'CASH_REGISTER.close_session' | translate }}</h3>
            <form (ngSubmit)="closeAction()" class="grid gap-3 sm:grid-cols-[180px_auto] sm:items-end">
              <input type="number" step="0.01" min="0" [(ngModel)]="closingBalance" name="closingBalance" class="form-input" [placeholder]="('CASH_REGISTER.closing_balance' | translate)" />
              <button
                type="submit"
                [disabled]="busy()"
                class="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
              >
                {{ 'CASH_REGISTER.close' | translate }}
              </button>
            </form>
          </div>
        }

        @if (isOpen() && canManage()) {
          <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              <lucide-angular [img]="Scale" class="h-4 w-4"></lucide-angular>
              {{ 'CASH_REGISTER.manual_movement' | translate }}
            </h3>
            <form (ngSubmit)="manualMovement()" class="grid gap-3 sm:grid-cols-[160px_150px_1fr_auto]">
              <select [(ngModel)]="manualType" name="manualType" class="form-input">
                <option value="DEPOSIT">{{ 'ENUMS.DEPOSIT' | translate }}</option>
                <option value="WITHDRAWAL">{{ 'ENUMS.WITHDRAWAL' | translate }}</option>
                <option value="ADJUSTMENT">{{ 'ENUMS.ADJUSTMENT' | translate }}</option>
              </select>
              <input type="number" step="0.01" min="0.01" [(ngModel)]="manualAmount" name="manualAmount" class="form-input" [placeholder]="('CASH_REGISTER.amount' | translate)" />
              <input [(ngModel)]="manualDescription" name="manualDescription" class="form-input" [placeholder]="('CASH_REGISTER.description' | translate)" />
              <button type="submit" [disabled]="busy()" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
                {{ 'COMMON.save' | translate }}
              </button>
            </form>
          </div>
        }

        @if (!isOpen() && canManage()) {
          <form [formGroup]="openForm" (ngSubmit)="doOpen()" class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-slate-900">
            <app-form-field [label]="('CASH_REGISTER.register' | translate)" [required]="true" [control]="openForm.controls.cashRegisterId">
              <select formControlName="cashRegisterId" class="form-input">
                @for (register of registerOptions(); track register.value) {
                  <option [value]="register.value">{{ register.label }}</option>
                }
              </select>
            </app-form-field>
            <app-form-field [label]="('CASH_REGISTER.opening_balance' | translate)" [required]="true" [control]="openForm.controls.openingBalance">
              <input type="number" step="0.01" min="0" formControlName="openingBalance" class="form-input" />
            </app-form-field>
            <button
              type="submit"
              [disabled]="busy() || !openForm.controls.cashRegisterId.value"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {{ 'CASH_REGISTER.open' | translate }}
            </button>
          </form>
        }

        @if (difference() !== null) {
          <div [class]="'flex items-center justify-between rounded-2xl border p-5 ' + (difference() === 0 ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30')">
            <p class="text-sm font-semibold">
              {{ 'CASH_REGISTER.difference' | translate }}:
              <span class="font-bold">{{ difference() | number: '1.2-2' }}</span>
            </p>
          </div>
        }

        <app-data-table
          [columns]="columns"
          [rows]="movements()"
          [loading]="movementsLoading()"
          [hasActions]="false"
          [showPagination]="false"
        />
      }
    </div>
  `,
})
export class CashRegisterComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<MovementRow>[] = [
    { key: 'type', label: 'CASH_REGISTER.type' },
    { key: 'amount', label: 'CASH_REGISTER.amount', align: 'end' },
    { key: 'reference', label: 'CASH_REGISTER.reference' },
    { key: 'description', label: 'CASH_REGISTER.description' },
    { key: 'createdAt', label: 'COMMON.date' },
  ];

  readonly loading = signal(true);
  readonly movementsLoading = signal(false);
  readonly busy = signal(false);
  readonly summary = signal<any>(null);
  readonly movements = signal<MovementRow[]>([]);
  readonly registerOptions = signal<SelectOption[]>([]);

  protected readonly closingBalance = signal<number | null>(null);
  protected readonly manualType = signal('DEPOSIT');
  protected readonly manualAmount = signal<number | null>(null);
  protected readonly manualDescription = signal('');

  protected readonly Scale = Scale;
  protected readonly LoaderCircle = LoaderCircle;

  readonly openForm = this.fb.group({
    cashRegisterId: ['', Validators.required],
    openingBalance: [0, [Validators.required, Validators.min(0)]],
  });

  readonly session = computed(() => this.summary()?.session ?? null);
  readonly isOpen = computed(() => this.session()?.status === 'OPEN');
  readonly difference = computed(() =>
    this.summary()?.difference !== null && this.summary()?.difference !== undefined ? this.summary()!.difference : null,
  );
  readonly currency = ' SAR';

  ngOnInit() {
    this.api.get<any[]>('/cash-register').subscribe({
      next: (list) => {
        this.registerOptions.set(list.map((r) => ({ value: r.id, label: r.name })));
        if (list.length > 0) {
          this.openForm.controls.cashRegisterId.setValue(list[0].id);
        }
        this.loadSummary();
      },
      error: () => this.loading.set(false),
    });
  }

  hasRegisters(): boolean {
    return this.registerOptions().length > 0;
  }

  canManage(): boolean {
    return this.authService.hasPermission('cash_register.open') || this.authService.hasPermission('cash_register.close');
  }

  doOpen() {
    this.busy.set(true);
    this.api
      .post('/cash-register/open', {
        cashRegisterId: this.openForm.controls.cashRegisterId.value,
        openingBalance: this.openForm.controls.openingBalance.value,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notifications.success('CASH_REGISTER.opened_success');
          this.loadSummary();
        },
        error: (err) => {
          this.busy.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }

  closeAction() {
    const value = this.closingBalance();
    if (value === null || value === undefined) {
      this.notifications.error('COMMON.errors.required_fields');
      return;
    }
    this.busy.set(true);
    this.api
      .post('/cash-register/close', { closingBalance: value })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notifications.success('CASH_REGISTER.closed_success');
          this.loadSummary();
        },
        error: (err) => {
          this.busy.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }

  manualMovement() {
    const amount = this.manualAmount();
    if (amount === null || amount === undefined || amount <= 0) {
      this.notifications.error('COMMON.errors.required_fields');
      return;
    }
    this.busy.set(true);
    this.api
      .post('/cash-register/movements', {
        type: this.manualType(),
        amount,
        description: this.manualDescription() || undefined,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.manualAmount.set(null);
          this.manualDescription.set('');
          this.notifications.success('CASH_REGISTER.moved_success');
          this.loadSummary();
        },
        error: (err) => {
          this.busy.set(false);
          this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
        },
      });
  }

  private loadSummary() {
    this.loading.set(true);
    this.api.get<any>('/cash-register/summary').subscribe({
      next: (res) => {
        this.summary.set(res);
        this.closingBalance.set(null);
        this.loading.set(false);
        this.loadMovements();
      },
      error: () => this.loading.set(false),
    });
  }

  private loadMovements() {
    this.movementsLoading.set(true);
    this.api.get<any>('/cash-register/movements').subscribe({
      next: (res) => {
        this.movements.set(
          (res.items ?? []).map((m: any) => ({
            type: m.type,
            amount: m.amount,
            reference: m.referenceId ? `${m.referenceType} · ${m.referenceId.slice(0, 8)}` : '—',
            description: m.description ?? '—',
            createdAt: new Date(m.createdAt).toLocaleString(),
          })),
        );
        this.movementsLoading.set(false);
      },
      error: () => this.movementsLoading.set(false),
    });
  }
}