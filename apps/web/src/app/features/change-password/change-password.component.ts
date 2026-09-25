import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Save } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent],
  template: `
    <div class="space-y-4">
      <app-page-header
        [title]="('AUTH.change_password_title' | translate)"
        [crumbs]="[('AUTH.change_password_title' | translate)]"
        [subtitle]="('AUTH.change_password_title' | translate)"
      />

      <form [formGroup]="form" (ngSubmit)="submit()" class="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div class="space-y-4">
          <app-form-field [label]="('AUTH.current_password' | translate)" [required]="true" [control]="form.controls.currentPassword">
            <input type="password" formControlName="currentPassword" autocomplete="current-password" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('AUTH.new_password' | translate)" [required]="true" [control]="form.controls.newPassword">
            <input type="password" formControlName="newPassword" autocomplete="new-password" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('AUTH.confirm_password' | translate)" [required]="true" [control]="form.controls.confirmPassword">
            <input type="password" formControlName="confirmPassword" autocomplete="new-password" class="form-input" />
          </app-form-field>
        </div>

        @if (form.errors?.['mismatch'] && (form.touched || form.dirty)) {
          <p class="mt-3 text-sm text-red-500">{{ 'AUTH.password_mismatch' | translate }}</p>
        }

        <div class="mt-5 flex justify-end">
          <button type="submit" [disabled]="form.invalid || saving()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
            <lucide-angular [img]="Save" class="h-4 w-4"></lucide-angular>
            {{ 'COMMON.save' | translate }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ChangePasswordComponent {
  private readonly api = inject(ApiService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: matchPasswordValidator },
  );

  protected readonly Save = Save;

  submit() {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.api.post<{ success: boolean }>('/auth/change-password', { currentPassword: raw.currentPassword, newPassword: raw.newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('AUTH.password_changed');
        this.form.reset();
      },
      error: (err) => {
        this.saving.set(false);
        const message = Array.isArray(err?.error?.message) ? err.error.message[0] : err?.error?.message;
        this.notifications.error(message ?? 'COMMON.errors.operation_failed');
      },
    });
  }
}

function matchPasswordValidator(control: AbstractControl): { mismatch: boolean } | null {
  const group = control as unknown as { value: { newPassword: string; confirmPassword: string } };
  if (!group.value || group.value.newPassword !== group.value.confirmPassword) {
    return { mismatch: true };
  }
  return null;
}