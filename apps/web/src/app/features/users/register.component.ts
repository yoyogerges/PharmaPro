import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ArrowLeft, UserPlus } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, LucideAngularModule, RouterLink, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="mx-auto max-w-3xl space-y-4">
      <app-page-header
        [title]="('AUTH.register_title' | translate)"
        [crumbs]="[('NAV.users' | translate), ('AUTH.register_title' | translate)]"
      />

      <div class="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-2">
            <app-form-field [label]="('USERS.email' | translate)" [required]="true" [control]="form.controls.email">
              <input type="email" formControlName="email" class="form-input" [placeholder]="'USERS.email' | translate" />
            </app-form-field>
            <app-form-field [label]="('USERS.username' | translate)" [required]="true" [control]="form.controls.username">
              <input type="text" formControlName="username" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.password' | translate)" [required]="true" [control]="form.controls.password">
              <input type="password" formControlName="password" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.confirm_password' | translate)" [required]="true" [control]="form.controls.confirmPassword">
              <input type="password" formControlName="confirmPassword" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.first_name' | translate)" [control]="form.controls.firstName">
              <input type="text" formControlName="firstName" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.last_name' | translate)" [control]="form.controls.lastName">
              <input type="text" formControlName="lastName" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.phone' | translate)" [control]="form.controls.phone">
              <input type="text" formControlName="phone" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.status' | translate)" [control]="form.controls.status">
              <select formControlName="status" class="form-input">
                @for (s of statuses; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
            </app-form-field>
          </div>

          <fieldset class="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <legend class="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{{ 'USERS.roles' | translate }}</legend>
            <div class="flex flex-wrap gap-4">
              @for (role of roleOptions(); track role.id) {
                <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" [checked]="selectedRoles().has(role.id)" (change)="toggleRole(role.id)" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                  {{ role.displayName }}
                </label>
              }
              @if (roleOptions().length === 0) {
                <p class="text-sm text-slate-400">{{ 'COMMON.loading' | translate }}</p>
              }
            </div>
          </fieldset>

          <div class="flex items-center justify-between gap-3">
            <a routerLink="/users" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
              {{ 'COMMON.cancel' | translate }}
            </a>
            <button
              type="submit"
              [disabled]="form.invalid || saving()"
              class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
            >
              <lucide-angular [img]="UserPlus" class="h-4 w-4"></lucide-angular>
              {{ saving() ? ('COMMON.saving' | translate) : ('USERS.new' | translate) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  readonly saving = signal(false);
  readonly roleOptions = signal<RoleOption[]>([]);
  readonly selectedRoles = signal<Set<string>>(new Set());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    firstName: [''],
    lastName: [''],
    phone: [''],
    status: ['ACTIVE'],
  });

  protected readonly ArrowLeft = ArrowLeft;
  protected readonly UserPlus = UserPlus;

  ngOnInit() {
    this.loadRoles();
  }

  toggleRole(roleId: string) {
    this.selectedRoles.update((set) => {
      const next = new Set(set);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (raw.password !== raw.confirmPassword) {
      this.notifications.error('USERS.password_mismatch');
      return;
    }
    const payload: Record<string, unknown> = {
      email: raw.email.trim().toLowerCase(),
      username: raw.username.trim(),
      password: raw.password,
      firstName: raw.firstName?.trim() || undefined,
      lastName: raw.lastName?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      status: raw.status,
      roleIds: Array.from(this.selectedRoles()),
    };
    this.saving.set(true);
    this.api.post('/users', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('USERS.created_success');
        this.router.navigate(['/users']);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private loadRoles() {
    this.api.get<RoleOption[]>('/roles/options').subscribe({
      next: (roles) => this.roleOptions.set(roles.filter((r) => !r.isSystem)),
      error: () => undefined,
    });
  }
}