import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import type { HttpErrorResponse } from '@angular/common/http';
import type { ErrorResponse } from '@pharmapro/shared';
import { LucideAngularModule, Eye, EyeOff, Lock } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { ThemeService } from '@core/services/theme.service';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    LucideAngularModule,
    LanguageSwitcherComponent,
  ],
  template: `
    <div class="flex w-full max-w-md flex-col items-center justify-center">
      <div class="mb-6 flex justify-center gap-2">
        <img src="/images/logo.svg" alt="PharmaPro" class="h-12 w-12" />
      </div>

      <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
              {{ 'AUTH.login_title' | translate }}
            </h1>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ 'AUTH.login_subtitle' | translate }}
            </p>
          </div>
          <app-language-switcher />
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {{ 'AUTH.email_label' | translate }}
            </label>
            <input
              type="email"
              formControlName="email"
              autocomplete="username"
              class="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              placeholder="admin@pharmacy.local"
            />
          </div>
          <div>
            <div class="mb-1.5 flex items-center justify-between">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-300">
                {{ 'AUTH.password_label' | translate }}
              </label>
              <a routerLink="/forgot-password" class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400">
                {{ 'AUTH.forgot_password' | translate }}
              </a>
            </div>
            <div class="relative">
              <input
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                class="w-full rounded-lg border border-slate-300 bg-white py-2.5 pe-10 ps-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                placeholder="••••••••"
              />
              <button
                type="button"
                (click)="showPassword = !showPassword"
                class="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Toggle password"
              >
                <lucide-angular [img]="showPassword ? EyeOff : Eye" class="h-4 w-4"></lucide-angular>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input id="remember" type="checkbox" formControlName="remember"
              class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="remember" class="text-sm text-slate-600 dark:text-slate-300">
              {{ 'AUTH.remember_me' | translate }}
            </label>
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
          >
            <lucide-angular [img]="Lock" class="h-4 w-4"></lucide-angular>
            {{ loading() ? ('AUTH.logging_in' | translate) : ('AUTH.login_button' | translate) }}
          </button>
        </form>

        <div class="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <p class="font-semibold">Demo: admin@pharmacy.local / PharmaPro2024!</p>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  protected readonly theme = inject(ThemeService);

  readonly form = this.fb.nonNullable.group({
    email: ['admin@pharmacy.local', [Validators.required, Validators.email]],
    password: ['PharmaPro2024!', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  showPassword = false;

  ngOnInit(): void {
    if (this.authService.isLoggedIn) {
      this.router.navigate(['/dashboard']);
      return;
    }
    this.authService.init().then(() => {
      if (this.authService.isLoggedIn) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  protected loading() {
    return this.authService.isLoading();
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.authService.login(email, password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (error: HttpErrorResponse) => this.handleLoginError(error),
    });
  }

  private handleLoginError(error: HttpErrorResponse) {
    if (error.status === 403) {
      this.notifications.error(this.translate.instant('AUTH.account_disabled'));
    } else if (error.status === 401) {
      this.notifications.error(this.translate.instant('AUTH.invalid_credentials'));
    } else {
      const body = error.error as ErrorResponse | undefined;
      const message = Array.isArray(body?.message) ? body?.message[0] : body?.message;
      this.notifications.error(
        message || this.translate.instant('COMMON.errors.operation_failed'),
      );
    }
  }

  protected readonly Eye = Eye;
  protected readonly EyeOff = EyeOff;
  protected readonly Lock = Lock;
}