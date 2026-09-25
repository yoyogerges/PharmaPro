import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Building2, Save, SlidersHorizontal, Upload } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface Pharmacy {
  id: string;
  name: string;
  nameAr?: string | null;
  address?: string | null;
  addressAr?: string | null;
  phone?: string | null;
  email?: string | null;
  taxNumber?: string | null;
  logo?: string | null;
  currency?: string | null;
  timezone?: string | null;
}

interface SettingRow {
  key: string;
  value: string;
  group: string;
}

const CURRENCIES = ['SAR', 'USD', 'EUR', 'EGP', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'GBP'];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('SETTINGS.title' | translate)" [crumbs]="[('NAV.settings' | translate)]" [subtitle]="('SETTINGS.description' | translate)" />

      <div class="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          (click)="tab.set('pharmacy')"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
          [class.bg-white]="tab() === 'pharmacy'"
          [class.text-primary-600]="tab() === 'pharmacy'"
          [class.shadow-sm]="tab() === 'pharmacy'"
          [class.text-slate-500]="tab() !== 'pharmacy'"
        >
          <lucide-angular [img]="Building2" class="h-4 w-4"></lucide-angular>
          {{ 'SETTINGS.pharmacy_tab' | translate }}
        </button>
        <button
          type="button"
          (click)="tab.set('general')"
          class="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition"
          [class.bg-white]="tab() === 'general'"
          [class.text-primary-600]="tab() === 'general'"
          [class.shadow-sm]="tab() === 'general'"
          [class.text-slate-500]="tab() !== 'general'"
        >
          <lucide-angular [img]="SlidersHorizontal" class="h-4 w-4"></lucide-angular>
          {{ 'SETTINGS.general_tab' | translate }}
        </button>
      </div>

      @if (tab() === 'pharmacy') {
        <form [formGroup]="form" (ngSubmit)="savePharmacy()" class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('SETTINGS.name' | translate)" [required]="true" [control]="form.controls.name">
              <input type="text" formControlName="name" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.name_ar' | translate)" [control]="form.controls.nameAr">
              <input type="text" formControlName="nameAr" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.phone' | translate)" [control]="form.controls.phone">
              <input type="text" formControlName="phone" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.email' | translate)" [control]="form.controls.email">
              <input type="email" formControlName="email" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.tax_number' | translate)" [control]="form.controls.taxNumber">
              <input type="text" formControlName="taxNumber" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.currency' | translate)" [control]="form.controls.currency">
              <select formControlName="currency" class="form-input">
                @for (c of currencies; track c) {
                  <option [value]="c">{{ c }}</option>
                }
              </select>
            </app-form-field>
            <app-form-field [label]="('SETTINGS.address' | translate)" [control]="form.controls.address">
              <input type="text" formControlName="address" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.address_ar' | translate)" [control]="form.controls.addressAr">
              <input type="text" formControlName="addressAr" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('SETTINGS.timezone' | translate)" [control]="form.controls.timezone">
              <input type="text" formControlName="timezone" class="form-input" />
            </app-form-field>
          </div>

          <div class="mt-5 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <p class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">{{ 'SETTINGS.logo' | translate }}</p>
            <div class="flex flex-wrap items-center gap-4">
              <img [src]="logoUrl()" alt="logo" class="h-16 w-16 rounded-xl border border-slate-200 bg-white object-contain p-1 dark:border-slate-700" />
              <div class="flex items-center gap-2">
                <input #fileInput type="file" accept="image/png,image/jpeg,image/svg+xml" class="hidden" (change)="onFile($event)" />
                <button type="button" (click)="fileInput.click()" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <lucide-angular [img]="Upload" class="h-4 w-4"></lucide-angular>
                  {{ 'SETTINGS.upload_logo' | translate }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-5 flex justify-end">
            <button type="submit" [disabled]="form.invalid || saving()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              <lucide-angular [img]="Save" class="h-4 w-4"></lucide-angular>
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      }

      @if (tab() === 'general') {
        <form (ngSubmit)="saveGeneral()" class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          @if (settings().length === 0) {
            <p class="text-sm text-slate-400">{{ 'SETTINGS.no_settings' | translate }}</p>
          }
          @for (group of groups(); track group) {
            <h3 class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 first:mt-0">{{ group === '' ? ('SETTINGS.general' | translate) : (group | uppercase) }}</h3>
            <div class="grid gap-3 sm:grid-cols-2">
              @for (row of rowsFor(group); track row.key) {
                <label class="flex flex-col gap-1 text-sm">
                  <span class="font-medium text-slate-600 dark:text-slate-300">{{ labelOf(row.key) }}</span>
                  <input type="text" [ngModel]="row.value" [ngModelOptions]="{ standalone: true }" (ngModelChange)="edits[row.key] = $event" class="form-input" />
                </label>
              }
            </div>
          }
          <div class="mt-5 flex justify-end">
            <button type="submit" [disabled]="saving()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              <lucide-angular [img]="Save" class="h-4 w-4"></lucide-angular>
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class SettingsComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly tab = signal<'pharmacy' | 'general'>('pharmacy');
  readonly saving = signal(false);
  readonly pharmacy = signal<Pharmacy | null>(null);
  readonly settings = signal<SettingRow[]>([]);
  readonly logoVersion = signal(0);
  readonly currencies = CURRENCIES;

  readonly edits: Record<string, string> = {};

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    nameAr: [''],
    address: [''],
    addressAr: [''],
    phone: [''],
    email: [''],
    taxNumber: [''],
    currency: ['SAR'],
    timezone: ['Asia/Riyadh'],
  });

  protected readonly Building2 = Building2;
  protected readonly SlidersHorizontal = SlidersHorizontal;
  protected readonly Save = Save;
  protected readonly Upload = Upload;

  ngOnInit() {
    this.load();
  }

  logoUrl(): string {
    return `${this.api.baseUrl}/settings/logo?v=${this.logoVersion()}`;
  }

  groups(): string[] {
    return Array.from(new Set(this.settings().map((s) => s.group || '')));
  }

  rowsFor(group: string): SettingRow[] {
    return this.settings().filter((s) => (s.group || '') === group);
  }

  labelOf(key: string): string {
    return key
      .replace(/^av\s*\.\s*/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      this.notifications.error('SETTINGS.logo_invalid');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    this.api.upload('/settings/logo', formData).subscribe({
      next: () => {
        this.notifications.success('SETTINGS.logo_upload_success');
        this.logoVersion.update((v) => v + 1);
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  savePharmacy() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      name: raw.name.trim(),
      nameAr: raw.nameAr?.trim() || undefined,
      address: raw.address?.trim() || undefined,
      addressAr: raw.addressAr?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      email: raw.email?.trim() || undefined,
      taxNumber: raw.taxNumber?.trim() || undefined,
      currency: raw.currency,
      timezone: raw.timezone?.trim() || undefined,
    };
    this.saving.set(true);
    this.api.patch('/settings/pharmacy', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('SETTINGS.pharmacy_saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  saveGeneral() {
    const payload: Record<string, unknown> = {};
    for (const row of this.settings()) {
      if (row.key in this.edits && this.edits[row.key] !== row.value) {
        payload['settings.' + row.key] = this.edits[row.key];
      }
    }
    if (Object.keys(payload).length === 0) {
      this.notifications.info('SETTINGS.no_changes');
      return;
    }
    this.saving.set(true);
    this.api.patch('/settings', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('SETTINGS.general_saved');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private load() {
    this.api.get<{ pharmacy: Pharmacy; settings: SettingRow[] }>('/settings').subscribe({
      next: (res) => {
        this.pharmacy.set(res.pharmacy ?? null);
        this.settings.set(res.settings ?? []);
        const p = res.pharmacy;
        this.form.patchValue({
          name: p?.name ?? '',
          nameAr: p?.nameAr ?? '',
          address: p?.address ?? '',
          addressAr: p?.addressAr ?? '',
          phone: p?.phone ?? '',
          email: p?.email ?? '',
          taxNumber: p?.taxNumber ?? '',
          currency: p?.currency ?? 'SAR',
          timezone: p?.timezone ?? 'Asia/Riyadh',
        });
      },
    });
  }
}