import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-pos-layout',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <div class="h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <router-outlet />
      <app-toast-container />
    </div>
  `,
})
export class PosLayoutComponent {}