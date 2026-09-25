import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';

const SIDEBAR_KEY = 'pp_sidebar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastContainerComponent],
  template: `
    <div class="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <app-sidebar [expanded]="sidebarOpen()" />
      <div class="flex min-w-0 flex-1 flex-col">
        <app-topbar (sidebarToggle)="toggleSidebar()" />
        <main class="flex-1 overflow-y-auto p-4 sm:p-6">
          <router-outlet />
        </main>
      </div>
      <app-toast-container />
    </div>
  `,
})
export class MainLayoutComponent {
  readonly sidebarOpen = signal<boolean>(localStorage.getItem(SIDEBAR_KEY) !== '0');

  toggleSidebar() {
    this.sidebarOpen.update((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  }
}