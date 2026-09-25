import { Component, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor, type AbstractControl } from '@angular/forms';
import { LucideAngularModule, ChevronDown, Search } from 'lucide-angular';
import { ClickOutsideDirective } from '@shared/directives/click-outside.directive';

export interface SelectOption<T = string> {
  value: T;
  label: string;
  hint?: string;
}

@Component({
  selector: 'app-select-search',
  standalone: true,
  imports: [LucideAngularModule, ClickOutsideDirective],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectSearchComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative" [appClickOutside]="close">
      <button
        type="button"
        (click)="toggle()"
        class="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <span class="truncate">{{ selectedLabel() }}</span>
        <lucide-angular [img]="ChevronDown" class="h-4 w-4 shrink-0 text-slate-400"></lucide-angular>
      </button>
      @if (isOpen()) {
        <div
          class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card dark:border-slate-700 dark:bg-slate-800"
        >
          @if (searchable()) {
            <div class="border-b border-slate-100 p-2 dark:border-slate-700">
              <div class="relative">
                <lucide-angular [img]="Search" class="absolute start-3 top-2.5 h-4 w-4 text-slate-400"></lucide-angular>
                <input
                  #search
                  (input)="filter.set(search.value)"
                  class="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pe-2 ps-8 text-sm focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  [placeholder]="searchPlaceholder()"
                />
              </div>
            </div>
          }
          <ul class="max-h-56 overflow-y-auto p-1">
            <li>
              <button
                type="button"
                (click)="select(null)"
                class="w-full rounded-md px-3 py-2 text-start text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {{ emptyLabel() }}
              </button>
            </li>
            @for (option of filteredOptions(); track option.value) {
              <li>
                <button
                  type="button"
                  (click)="select(option.value)"
                  class="flex w-full items-center justify-between rounded-md px-3 py-2 text-start text-sm text-slate-700 hover:bg-primary-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  [class.bg-primary-50!]="option.value === value()"
                >
                  <span>{{ option.label }}</span>
                  @if (option.hint) {
                    <span class="text-xs text-slate-400">{{ option.hint }}</span>
                  }
                </button>
              </li>
            } @empty {
              <li class="px-3 py-4 text-center text-sm text-slate-400">No options</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class SelectSearchComponent implements ControlValueAccessor {
  readonly options = input<SelectOption[]>([]);
  readonly placeholder = input('COMMON.select');
  readonly emptyLabel = input('COMMON.none');
  readonly searchable = input(true);
  readonly searchPlaceholder = input('COMMON.search');

  readonly isOpen = signal(false);
  readonly filter = signal('');
  readonly writeValueSignal = signal<string | null>(null);

  value(): string | null {
    return this.writeValueSignal();
  }

  selectedLabel(): string {
    const v = this.writeValueSignal();
    if (!v) return this.placeholder();
    return this.options().find((o) => String(o.value) === String(v))?.label ?? this.placeholder();
  }

  filteredOptions(): SelectOption[] {
    const q = this.filter().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.label.toLowerCase().includes(q));
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }

  close() {
    this.isOpen.set(false);
  }

  select(value: string | null) {
    this.writeValue(value);
    this.onChange(value);
    this.isOpen.set(false);
  }

  onChange: (value: string | null) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.writeValueSignal.set(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected readonly ChevronDown = ChevronDown;
  protected readonly Search = Search;
}