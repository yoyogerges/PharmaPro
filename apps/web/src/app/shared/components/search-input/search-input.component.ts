import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X } from 'lucide-angular';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="relative">
      <div class="pointer-events-none absolute inset-y-0 start-3 flex items-center">
        <lucide-angular [img]="Search" class="h-4 w-4 text-slate-400"></lucide-angular>
      </div>
      <input
        [ngModel]="model"
        (ngModelChange)="onChange($event)"
        type="text"
        [placeholder]="placeholder()"
        class="w-full rounded-lg border border-slate-300 bg-white py-2 pe-3 ps-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />
      @if (model) {
        <button
          type="button"
          (click)="clear()"
          class="absolute inset-y-0 end-2 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Clear"
        >
          <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
        </button>
      }
    </div>
  `,
})
export class SearchInputComponent {
  readonly placeholder = input('COMMON.search');
  readonly debounce = input(350);
  readonly changed = output<string>();

  model = '';

  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly Search = Search;
  protected readonly X = X;

  onChange(value: string) {
    this.model = value;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.changed.emit(value), this.debounce());
  }

  clear() {
    this.model = '';
    this.changed.emit('');
  }
}