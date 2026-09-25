import { Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, CalendarDays } from 'lucide-angular';
import type { AppLanguage } from '@core/services/theme.service';

export interface DateRange {
  start: string;
  end: string;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="flex items-center gap-2">
      <lucide-angular [img]="CalendarDays" class="h-4 w-4 text-slate-400"></lucide-angular>
      <input
        [ngModel]="start()"
        (ngModelChange)="onStart($event)"
        type="date"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      <span class="text-slate-400">—</span>
      <input
        [ngModel]="end()"
        (ngModelChange)="onEnd($event)"
        type="date"
        class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
    </div>
  `,
})
export class DateRangePickerComponent {
  readonly changed = output<DateRange>();

  readonly start = signal('');
  readonly end = signal('');

  onStart(value: string) {
    this.start.set(value);
    this.emit();
  }

  onEnd(value: string) {
    this.end.set(value);
    this.emit();
  }

  private emit() {
    this.changed.emit({ start: this.start(), end: this.end() });
  }

  protected readonly CalendarDays = CalendarDays;
}