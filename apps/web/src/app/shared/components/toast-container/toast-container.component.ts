import { Component, inject } from '@angular/core';
import { NotificationService, type ToastType } from '@core/services/notification.service';
import { LucideAngularModule, X, CircleCheck, CircleX, TriangleAlert, Info } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular';

const typeIcon = (type: ToastType): LucideIconData => {
  switch (type) {
    case 'success':
      return CircleCheck;
    case 'error':
      return CircleX;
    case 'warning':
      return TriangleAlert;
    default:
      return Info;
  }
};

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="fixed end-4 top-4 z-[100] flex w-80 flex-col gap-2">
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-card animate-[fadeIn_.2s_ease-out]"
          [class]="styleFor(toast.type)"
        >
          <lucide-angular [img]="iconFor(toast.type)" class="mt-0.5 h-4 w-4 shrink-0"></lucide-angular>
          <div class="min-w-0 flex-1">
            @if (toast.title) {
              <p class="text-sm font-semibold">{{ toast.title }}</p>
            }
            <p class="text-sm">{{ toast.message }}</p>
          </div>
          <button
            type="button"
            (click)="notificationService.remove(toast.id)"
            class="text-slate-400 transition hover:text-slate-600"
            aria-label="Close"
          >
            <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly notificationService = inject(NotificationService);

  protected readonly X = X;

  styleFor(type: ToastType): string {
    return NotificationService.styleOf(type);
  }

  iconFor(type: ToastType): LucideIconData {
    return typeIcon(type);
  }
}