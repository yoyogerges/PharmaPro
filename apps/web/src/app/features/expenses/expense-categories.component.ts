import { Component, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Pencil, Plus, X } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/auth/auth.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { DataTableComponent, type TableColumn } from '@shared/components/data-table/data-table.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

interface ExpenseCategoryRow {
  id: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-expense-categories',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, DataTableComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <app-page-header
          [title]="('EXPENSES.category_title' | translate)"
          [crumbs]="[('NAV.expenses' | translate), ('EXPENSES.categories' | translate)]"
        >
          @if (canCreate()) {
            <button type="button" (click)="openForm()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700">
              <lucide-angular [img]="Plus" class="h-4 w-4"></lucide-angular>
              {{ 'EXPENSES.new_category' | translate }}
            </button>
          }
        </app-page-header>
      </div>

      @if (formOpen()) {
        <form [formGroup]="form" (ngSubmit)="submit()" class="rounded-2xl border border-primary-200 bg-primary-50/40 p-5 dark:border-primary-900 dark:bg-primary-950/30">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {{ (editingId() ? 'EXPENSES.edit_category' : 'EXPENSES.new_category') | translate }}
            </h3>
            <button type="button" (click)="closeForm()" class="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
            </button>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <app-form-field [label]="('EXPENSES.category' | translate)" [required]="true" [control]="form.controls.name">
              <input type="text" formControlName="name" class="form-input" />
            </app-form-field>
            <app-form-field [label]="('EXPENSES.description' | translate)" [control]="form.controls.description" class="sm:col-span-2">
              <input type="text" formControlName="description" class="form-input" />
            </app-form-field>
          </div>
          <div class="mt-4 flex items-center justify-end gap-2">
            <button type="button" (click)="closeForm()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300">
              {{ 'COMMON.cancel' | translate }}
            </button>
            <button type="submit" [disabled]="form.invalid" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
              {{ 'COMMON.save' | translate }}
            </button>
          </div>
        </form>
      }

      <app-data-table
        [columns]="columns"
        [rows]="rows()"
        [loading]="loading()"
        [hasActions]="canUpdate()"
        [showPagination]="false"
        [rowTemplate]="actionsTpl"
      >
        <ng-template #actionsTpl let-row>
          <div class="flex items-center justify-end gap-1">
            @if (canUpdate()) {
              <button type="button" (click)="onEdit($event, row)" class="rounded-md p-1.5 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-900/30">
                <lucide-angular [img]="Pencil" class="h-4 w-4"></lucide-angular>
              </button>
            }
          </div>
        </ng-template>
      </app-data-table>
    </div>
  `,
})
export class ExpenseCategoriesComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly columns: TableColumn<ExpenseCategoryRow>[] = [
    { key: 'name', label: 'EXPENSES.category' },
    { key: 'description', label: 'EXPENSES.description' },
  ];

  readonly loading = signal(true);
  readonly formOpen = signal(false);
  readonly editingId = signal('');
  readonly rows = signal<ExpenseCategoryRow[]>([]);

  protected readonly Plus = Plus;
  protected readonly Pencil = Pencil;
  protected readonly X = X;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
  });

  ngOnInit() {
    this.load();
  }

  canCreate(): boolean {
    return this.authService.hasPermission('expenses.create');
  }

  canUpdate(): boolean {
    return this.authService.hasPermission('expenses.update');
  }

  openForm() {
    this.editingId.set('');
    this.form.reset();
    this.formOpen.set(true);
  }

  onEdit(event: Event, row: ExpenseCategoryRow) {
    event.stopPropagation();
    this.editingId.set(row.id);
    this.form.patchValue({ name: row.name, description: row.description || '' });
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editingId.set('');
  }

  submit() {
    if (this.form.invalid) {
      return;
    }
    const { name, description } = this.form.value;
    const request = this.editingId()
      ? this.api.patch(`/expense-categories/${this.editingId()}`, { name, description: description || undefined })
      : this.api.post('/expense-categories', { name, description: description || undefined });
    request.subscribe({
      next: () => {
        this.notifications.success(this.editingId() ? 'EXPENSES.category_updated' : 'EXPENSES.category_created');
        this.closeForm();
        this.load();
      },
      error: (err) => this.notifications.error(err?.error?.message ?? 'COMMON.errors.operation_failed'),
    });
  }

  private load() {
    this.loading.set(true);
    this.api.get<any[]>('/expense-categories').subscribe({
      next: (list) => {
        this.rows.set(list.map((c) => ({ id: c.id, name: c.name, description: c.description ?? '—' })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}