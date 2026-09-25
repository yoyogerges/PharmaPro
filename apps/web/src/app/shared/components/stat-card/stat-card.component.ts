import { Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import type { LucideIconData } from 'lucide-angular';

export type StatTone = 'emerald' | 'blue' | 'amber' | 'red' | 'violet' | 'slate';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ label() }}</p>
          <p class="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {{ value() }}
          </p>
        </div>
        @if (icon()) {
          <div class="flex h-11 w-11 items-center justify-center rounded-xl" [class]="iconClass()">
            <lucide-angular [img]="icon()" [strokeWidth]="2" class="h-5 w-5"></lucide-angular>
          </div>
        }
      </div>
      @if (sub()) {
        <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">{{ sub() }}</p>
      }
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly icon = input<LucideIconData>();
  readonly sub = input<string>();
  readonly tone = input<StatTone>('emerald');

  protected readonly iconClass = computed(() => {
    const map: Record<StatTone, string> = {
      emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
      amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
      red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
      violet: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
      slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    };
    return map[this.tone()];
  });
}