import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <router-outlet />
    </div>
    <app-toast-container />
  `,
})
export class AuthLayoutComponent {}