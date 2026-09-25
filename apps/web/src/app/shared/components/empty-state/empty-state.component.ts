import { Component, input } from '@angular/core';
import { LucideAngularModule, Inbox } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center py-14 text-center">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        @if (icon()) {
          <lucide-angular [img]="icon()" [strokeWidth]="1.5" class="h-8 w-8"></lucide-angular>
        } @else {
          <lucide-angular [img]="Inbox" [strokeWidth]="1.5" class="h-8 w-8"></lucide-angular>
        }
      </div>
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {{ title() }}
      </h3>
      @if (message()) {
        <p class="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<LucideIconData>();
  readonly title = input('COMMON.empty.no_data');
  readonly message = input<string>();
  protected readonly Inbox = Inbox;
}