import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Trash2, Plus, X, ShieldCheck } from 'lucide-angular';
import type { PaginatedData } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SearchInputComponent } from '@shared/components/search-input/search-input.component';

interface RoleRow {
  id: string;
  displayName: string;
  name: string;
  description: string;
  userCount: number;
  permissionCount: number;
  isSystem: boolean;
  status: string;
}

interface PermissionRow {
  id: string;
  key: string;
  module: string;
  action: string;
  displayName: string;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent, SearchInputComponent],
  template: `
    <div class="space-y-4">
      <app-page-header [title]="('ROLES.title' | translate)" [crumbs]="[('NAV.roles' | translate)]" [subtitle]="('ROLES.title' | translate)">
        @if (canCreate()) {
          <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
            <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
            {{ 'ROLES.new' | translate }}
          </button>
        }
      </app-page-header>

      <div class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <app-search-input class="lg:w-72" [placeholder]="('COMMON.search' | translate)" (changed)="onSearch($event)" />
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'ROLES.edit_title' : 'ROLES.new') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            @if (!editingId()) {
              <app-form-field [label]="('ROLES.name' | translate)" [required]="true" [control]="form.controls.name">
                <input type="text" formControlName="name" class="form-input" />
              </app-form-field>
            }
            <app-form-field [label]="('ROLES.display_name' | translate)" [required]="true" [control]="form.controls.displayName">
              <input type="text" formControlName="displayName" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('ROLES.description' | translate)" [control]="form.controls.description">
              <input type="text" formControlName="description" class="form-input" />
            </app-form-field>
          </div>

          <fieldset class="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <legend class="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{{ 'ROLES.assign_permissions' | translate }}</legend>
            <div class="space-y-4">
              @for (module of modules(); track module) {
                <div>
                  <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{{ moduleLabel(module) }}</h4>
                  <div class="flex flex-wrap gap-x-5 gap-y-2">
                    @for (perm of permsFor(module); track perm.id) {
                      <label class="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <input type="checkbox" [checked]="selectedPerms().has(perm.id)" (change)="togglePerm(perm.id)" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
                        {{ perm.displayName }}
                      </label>
                    }
                  </div>
                </div>
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
        [hasActions]="true"
        [actionsLabel]="'COMMON.actions'"
        [rowTemplate]="actionsTpl"
        (pageChange)="onPage($event)"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (row.isSystem) {
              <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <lucide-angular [img]="ShieldCheck" class="h-3.5 w-3.5"></lucide-angular>
                {{ 'ROLES.system_badge' | translate }}
              </span>
            } @else {
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
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class RolesComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<RoleRow>[] = [
    { key: 'displayName', label: 'ROLES.display_name' },
    { key: 'name', label: 'ROLES.name' },
    { key: 'description', label: 'ROLES.description' },
    { key: 'userCount', label: 'ROLES.users_count', align: 'end' },
    { key: 'permissionCount', label: 'ROLES.permission_count', align: 'end' },
    { key: 'status', label: 'COMMON.status' },
  ];

  readonly query = { page: 1, limit: 15, search: '' };

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly total = signal(0);
  readonly rows = signal<RoleRow[]>([]);
  readonly allPermissions = signal<PermissionRow[]>([]);
  readonly selectedPerms = signal<Set<string>>(new Set());
  readonly formOpen = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
    displayName: ['', [Validators.required]],
    description: [''],
  });

  protected readonly Pencil = Pencil;
  protected readonly Trash2 = Trash2;
  protected readonly Plus = Plus;
  protected readonly X = X;
  protected readonly ShieldCheck = ShieldCheck;

  ngOnInit() {
    this.load();
    this.loadPermissions();
  }

  canCreate() {
    return this.authService.hasPermission('roles.create');
  }
  canUpdate() {
    return this.authService.hasPermission('roles.update');
  }
  canDelete() {
    return this.authService.hasPermission('roles.delete');
  }

  modules(): string[] {
    return Array.from(new Set(this.allPermissions().map((p) => p.module)));
  }

  moduleLabel(module: string): string {
    return module.charAt(0).toUpperCase() + module.slice(1).replace(/[_-]+/g, ' ');
  }

  permsFor(module: string): PermissionRow[] {
    return this.allPermissions().filter((p) => p.module === module);
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
    this.form.reset({ name: '', displayName: '', description: '' });
    this.selectedPerms.set(new Set());
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
  }

  onEdit(event: MouseEvent, row: RoleRow) {
    event.stopPropagation();
    this.editingId.set(row.id);
    this.api.get<any>(`/roles/${row.id}`).subscribe({
      next: (role) => {
        this.form.patchValue({
          name: role.name ?? '',
          displayName: role.displayName ?? '',
          description: role.description ?? '',
        });
        const idByKey = new Map(this.allPermissions().map((p) => [p.key, p.id]));
        this.selectedPerms.set(new Set((role.permissions ?? []).map((key: string) => idByKey.get(key)).filter(Boolean)));
        this.formOpen.set(true);
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  onDelete(event: MouseEvent, row: RoleRow) {
    event.stopPropagation();
    if (!window.confirm(`${row.displayName}?`)) return;
    this.api.delete(`/roles/${row.id}`).subscribe({
      next: () => {
        this.notifications.success('ROLES.deleted_success');
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  togglePerm(permId: string) {
    this.selectedPerms.update((set) => {
      const next = new Set(set);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      displayName: raw.displayName.trim(),
      description: raw.description?.trim() || undefined,
      permissionIds: Array.from(this.selectedPerms()),
    };
    const id = this.editingId();
    if (!id) payload['name'] = raw.name.trim();
    this.saving.set(true);
    const request = id ? this.api.patch(`/roles/${id}`, payload) : this.api.post('/roles', payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(id ? 'ROLES.updated_success' : 'ROLES.created_success');
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
      .get<PaginatedData<any>>('/roles', {
        page: this.query.page,
        limit: this.query.limit,
        search: this.query.search,
      })
      .subscribe({
        next: (res) => {
          this.rows.set(
            res.items.map((r: any) => ({
              id: r.id,
              displayName: r.displayName,
              name: r.name,
              description: r.description ?? '—',
              userCount: r.userCount,
              permissionCount: r.permissionCount,
              isSystem: r.isSystem,
              status: r.isSystem ? 'SYSTEM' : 'CUSTOM',
            })),
          );
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  private loadPermissions() {
    this.api.get<PermissionRow[]>('/roles/permission-ids').subscribe({
      next: (perms) => this.allPermissions.set(perms),
      error: () => undefined,
    });
  }
}