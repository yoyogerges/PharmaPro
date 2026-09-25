import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus, X, UserPlus } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';

interface UserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  roles: string;
  status: string;
  lastLogin: string;
}

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
  isSystem: boolean;
}

const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, RouterLink, PageHeaderComponent, DataTableComponent, FormFieldComponent, SearchInputComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('USERS.title' | translate)" [crumbs]="[('NAV.users' | translate)]" [subtitle]="('USERS.title' | translate)">
        @if (canCreate()) {
          <div class="flex items-center gap-2">
            <a routerLink="/users/register" class="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900 dark:text-primary-400">
              <lucide-angular [img]="UserPlus" class="h-4 w-4"></lucide-angular>
              {{ 'AUTH.register_title' | translate }}
            </a>
            <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
              <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
              {{ 'USERS.new' | translate }}
            </button>
          </div>
        }
      </app-page-header>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="lg:w-72" [placeholder]="('COMMON.search' | translate)" (changed)="onSearch($event)" />
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'USERS.edit_title' : 'USERS.new') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <app-form-field [label]="('USERS.email' | translate)" [required]="true" [control]="form.controls.email">
              <input type="email" formControlName="email" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.username' | translate)" [required]="true" [control]="form.controls.username">
              <input type="text" formControlName="username" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('USERS.password' | translate)" [required]="!editingId()" [control]="form.controls.password">
              <input type="password" formControlName="password" class="form-input" [placeholder]="editingId() ? ('USERS.password_placeholder' | translate) : ''" />
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
          <fieldset class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <legend class="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{{ 'USERS.roles' | translate }}</legend>
            <div class="flex flex-wrap gap-4">
              @for (role of roleOptions(); track role.id) {
                <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" [checked]="selectedRoles().has(role.id)" (change)="toggleRole(role.id)" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                  {{ role.displayName }}
                </label>
              }
            </div>
          </fieldset>
          <div class="mt-4 flex justify-end">
            <button type="submit" [disabled]="form.invalid || saving()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      }

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [page]="query.page"
        [limit]="query.limit"
        [total]="total()"
        [hasActions]="canUpdate() || canDelete()"
        [actionsLabel]="'COMMON.actions'"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (canUpdate()) {
              <button type="button" (click)="onEdit($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30">
                <lucide-angular [img]="Pencil" class="h-4 w-4"></lucide-angular>
              </button>
            }
            @if (canDelete()) {
              <button type="button" (click)="onDelete($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
              </button>
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<UserRow>[] = [
    { key: 'name', label: 'USERS.name' },
    { key: 'username', label: 'USERS.username' },
    { key: 'email', label: 'USERS.email' },
    { key: 'roles', label: 'USERS.roles' },
    { key: 'status', label: 'USERS.status' },
    { key: 'lastLogin', label: 'USERS.last_login' },
  ];

  readonly query = { page: 1, limit: 15, search: '' };
  readonly statuses = STATUSES;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly rows = signal<UserRow[]>([]);
  readonly roleOptions = signal<RoleOption[]>([]);
  readonly selectedRoles = signal<Set<string>>(new Set());
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required]],
    password: ['', [Validators.minLength(8)]],
    firstName: [''],
    lastName: [''],
    phone: [''],
    status: ['ACTIVE'],
  });

  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;
  protected readonly X = X;
  protected readonly UserPlus = UserPlus;

  ngOnInit() {
    this.load();
    this.loadRoles();
  }

  canCreate() {
    return this.authService.hasPermission('users.create');
  }
  canUpdate() {
    return this.authService.hasPermission('users.update');
  }
  canDelete() {
    return this.authService.hasPermission('users.delete');
  }

  onSearch(term: string) {
    this.query.search = term;
    this.query.page = 1;
    this.load();
  }

  onPage(event: { page: number; limit: number }) {
    this.query.page = event.page;
    this.query.limit = event.limit;
    this.load();
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ email: '', username: '', password: '', firstName: '', lastName: '', phone: '', status: 'ACTIVE' });
    this.selectedRoles.set(new Set());
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onEdit(event: MouseEvent, row: UserRow) {
    event.stopPropagation();
    this.editingId.set(row.id);
    this.api.get<any>(`/users/${row.id}`).subscribe({
      next: (u) => {
        this.form.patchValue({
          email: u.email ?? '',
          username: u.username ?? '',
          password: '',
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          phone: u.phone ?? '',
          status: u.status ?? 'ACTIVE',
        });
        const namesToIds = new Map(this.roleOptions().map((r) => [r.name, r.id]));
        this.selectedRoles.set(new Set((u.roles ?? []).map((name: string) => namesToIds.get(name)).filter(Boolean)));
        this.formOpen.set(true);
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  onDelete(event: MouseEvent, row: UserRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.name}?`)) return;
    this.api.delete(`/users/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('USERS.deleted_success');
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
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
    const payload: Record<string, unknown> = {
      email: raw.email.trim().toLowerCase(),
      username: raw.username.trim(),
      firstName: raw.firstName?.trim() || undefined,
      lastName: raw.lastName?.trim() || undefined,
      phone: raw.phone?.trim() || undefined,
      status: raw.status,
      roleIds: Array.from(this.selectedRoles()),
    };
    const id = this.editingId();
    if (id) {
      delete payload['email'];
      delete payload['username'];
      if (raw.password) payload['password'] = raw.password;
    } else {
      if (!raw.password) {
        this.notifications.error('USERS.password_required');
        return;
      }
      payload['password'] = raw.password;
    }
    this.saving.set(true);
    const request = id ? this.api.patch(`/users/${id}`, payload) : this.api.post('/users', payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(id ? 'USERS.updated_success' : 'USERS.created_success');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed');
      },
    });
  }

  private load() {
    this.loading.set(true);
    this.api
      .get<PaginatedData<any>>('/users', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((u: any) => ({
              id: u.id,
              name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username,
              username: u.username,
              email: u.email,
              phone: u.phone ?? '',
              roles: (u.roles ?? []).join(', ') || '—',
              status: u.status,
              lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadRoles() {
    this.api.get<RoleOption[]>('/roles/options').subscribe({
      next: (roles) => this.roleOptions.set(roles.filter((r) => !r.isSystem)),
      error: () => undefined,
    });
  }
}