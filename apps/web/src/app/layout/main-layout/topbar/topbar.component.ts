import { Component, inject, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Menu, Bell, LogOut, KeyRound } from 'lucide-angular';
import { ApiService } from '@core/services/api.service';
import { AuthService } from '@core/auth/auth.service';
import { LanguageSwitcherComponent } from '@shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [TranslatePipe, LucideAngularModule, LanguageSwitcherComponent],
  template: `
    <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-6">
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="toggleSidebar()"
          class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <lucide-angular [img]="Menu" class="h-5 w-5"></lucide-angular>
        </button>
        <div class="relative">
          <input
            type="text"
            (keydown.enter)="globalSearch($event)"
            [placeholder]="'TOPBAR.search' | translate"
            class="hidden w-72 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 sm:block"
          />
        </div>
      </div>

      <div class="flex items-center gap-2">
        <app-language-switcher />
        <button
          type="button"
          (click)="goToNotifications()"
          class="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <lucide-angular [img]="Bell" class="h-5 w-5"></lucide-angular>
          @if (unreadCount() > 0) {
            <span class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {{ unreadCount() }}
            </span>
          }
        </button>

        <button
          type="button"
          (click)="goToChangePassword()"
          class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-primary-600 dark:text-slate-400 dark:hover:bg-slate-800"
          [title]="'AUTH.change_password_title'"
        >
          <lucide-angular [img]="KeyRound" class="h-5 w-5"></lucide-angular>
        </button>

        <div class="flex items-center gap-3 border-s border-slate-200 ps-3 dark:border-slate-800">
          <div class="hidden text-end sm:block">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">{{ fullName() }}</p>
            <p class="text-xs text-slate-400">{{ primaryRole() }}</p>
          </div>
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 dark:bg-primary-900 dark:text-primary-300">
            {{ initials() }}
          </div>
          <button
            type="button"
            (click)="logout()"
            class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-red-500 dark:text-slate-400 dark:hover:bg-slate-800"
            [title]="'TOPBAR.logout'"
          >
            <lucide-angular [img]="LogOut" class="h-5 w-5"></lucide-angular>
          </button>
        </div>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly sidebarToggle = output<void>();

  private readonly unread = signal(0);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.refreshUnread();
    this.pollTimer = setInterval(() => this.refreshUnread(), 60_000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  fullName(): string {
    const u = this.authService.user();
    return u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.username;
  }

  initials(): string {
    const u = this.authService.user();
    const parts = [u.firstName, u.lastName].filter(Boolean);
    return parts.length ? parts.map((p) => p[0]?.toUpperCase()).join('').slice(0, 2) : 'U';
  }

  primaryRole(): string {
    const roles = this.authService.roles();
    return roles.length ? roles.join(', ') : '—';
  }

  unreadCount(): number {
    return this.unread();
  }

  private refreshUnread() {
    const user = this.authService.user();
    if (!user?.id) return;
    this.api.get<{ count: number }>('/notifications/unread-count').subscribe({
      next: (res) => this.unread.set(res.count),
      error: () => undefined,
    });
  }

  toggleSidebar() {
    this.sidebarToggle.emit();
  }

  globalSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    if (value) {
      this.router.navigate(['/search'], { queryParams: { q: value } });
    }
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  goToChangePassword() {
    this.router.navigate(['/change-password']);
  }

  logout() {
    this.authService.logout().then(() => this.router.navigate(['/login']));
  }

  protected readonly Menu = Menu;
  protected readonly Bell = Bell;
  protected readonly LogOut = LogOut;
  protected readonly KeyRound = KeyRound;
}