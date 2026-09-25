import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NotificationService } from '@core/services/notification.service';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
        {{ 'AUTH.forgot_title' | translate }}
      </h1>
      <p class="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        {{ 'AUTH.forgot_subtitle' | translate }}
      </p>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {{ 'AUTH.email_label' | translate }}
          </label>
          <input
            type="email"
            formControlName="email"
            class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          [disabled]="form.invalid"
          class="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
        >
          {{ 'AUTH.send_reset' | translate }}
        </button>
      </form>
      <div class="mt-4 text-center">
        <a routerLink="/login" class="text-sm text-primary-600 hover:text-primary-700">
          {{ 'AUTH.back_to_login' | translate }}
        </a>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly notificationService = inject(NotificationService);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.api.post('/auth/forgot-password', this.form.getRawValue()).subscribe({
      next: () => this.notificationService.success('AUTH.sent_success'),
      error: () => this.notificationService.info('AUTH.sent_success'),
    });
  }
}