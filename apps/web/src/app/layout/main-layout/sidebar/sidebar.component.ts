import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, ChevronDown } from 'lucide-angular';
import { AuthService } from '@core/auth/auth.service';
import { ThemeService } from '@core/services/theme.service';
import { NAVIGATION_ITEMS, type MenuItem } from '@core/models/menu.model';
import { filter } from 'rxjs';

@Component({
  selector: 'app-sidebar-section',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LucideAngularModule],
  template: `
    <li [attr.title]="collapsed() ? (item().label | translate) : null">
      <button
        type="button"
        (click)="toggle.emit(item().key)"
        class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        [class.justify-center]="collapsed()"
      >
        <span class="flex items-center gap-3">
          <lucide-angular [img]="item().icon" class="h-5 w-5 shrink-0"></lucide-angular>
          @if (!collapsed()) {
            <span>{{ item().label | translate }}</span>
          }
        </span>
        @if (!collapsed()) {
          <lucide-angular
            [img]="ChevronDown"
            class="h-3.5 w-3.5 transition-transform"
            [class.rotate-180]="open()"
          ></lucide-angular>
        }
      </button>
      @if (open() && !collapsed()) {
        <ul class="ms-4 mt-1 space-y-0.5 border-s border-slate-200 ps-3 dark:border-slate-700">
          @for (child of item().children; track child.key) {
            <li>
              <a
                [routerLink]="child.route"
                routerLinkActive="text-primary-700 dark:text-primary-300"
                class="block rounded-md px-3 py-1.5 text-sm text-slate-500 transition hover:text-primary-600 dark:text-slate-400"
              >
                {{ child.label | translate }}
              </a>
            </li>
          }
        </ul>
      }
    </li>
  `,
})
export class SidebarSectionComponent {
  readonly item = input.required<MenuItem>();
  readonly open = input(false);
  readonly collapsed = input(false);
  readonly toggle = output<string>();

  protected readonly ChevronDown = ChevronDown;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, LucideAngularModule, SidebarSectionComponent],
  template: `
    @if (mobileOpen()) {
      <div class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" (click)="close.emit()"></div>
    }
    <aside
      class="fixed inset-y-0 left-0 z-50 flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-e border-slate-200 bg-white transition-transform duration-200 -translate-x-full lg:static lg:translate-x-0 dark:border-slate-800 dark:bg-slate-900"
      [class.translate-x-0]="mobileOpen()"
      [class]="!expanded() ? 'lg:w-[68px]' : ''"
    >
      <div class="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-800" [class.justify-center]="!expanded() && !mobileOpen()" [class.px-5]="expanded() || mobileOpen()">
        <img src="/images/logo.svg" alt="PharmaPro" class="h-8 w-8 shrink-0" />
        @if (expanded() || mobileOpen()) {
          <span class="text-lg font-bold text-primary-700 dark:text-primary-400">PharmaPro</span>
        }
      </div>

      <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <ul class="space-y-1">
          @for (item of visibleItems(); track item.key) {
            @if (item.children?.length) {
              <app-sidebar-section
                [item]="item"
                [open]="!!openGroups()[item.key]"
                [collapsed]="!expanded() && !mobileOpen()"
                (toggle)="toggleGroup($event)"
              />
            } @else {
              <li [attr.title]="!expanded() && !mobileOpen() ? (item.label | translate) : null">
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                  class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  [class.justify-center]="!expanded() && !mobileOpen()"
                >
                  <lucide-angular [img]="item.icon" class="h-5 w-5 shrink-0"></lucide-angular>
                  @if (expanded() || mobileOpen()) {
                    <span>{{ item.label | translate }}</span>
                  }
                </a>
              </li>
            }
          }
        </ul>
      </nav>

      @if (expanded() || mobileOpen()) {
        <div class="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <p class="text-xs text-slate-400">{{ 'SIDEBAR.version' | translate }} 1.0.0</p>
        </div>
      }
    </aside>
  `,
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly theme = inject(ThemeService);
  readonly expanded = input(true);
  readonly mobileOpen = input(false);
  readonly close = output<void>();
  readonly openGroups = signal<Record<string, boolean>>({});

  private readonly navSub: import('rxjs').Subscription;

  constructor() {
    this.navSub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (this.mobileOpen()) this.close.emit();
    });
    this.destroyRef.onDestroy(() => this.navSub.unsubscribe());
  }

  protected readonly visibleItems = computed(() =>
    NAVIGATION_ITEMS.filter((item) => !item.permission || this.authService.hasPermission(item.permission)),
  );

  toggleGroup(key: string) {
    this.openGroups.update((g) => ({ ...g, [key]: !g[key] }));
  }
}