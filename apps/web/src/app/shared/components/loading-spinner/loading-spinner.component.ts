import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div class="flex w-full items-center justify-center py-10" role="status">
      <svg
        class="animate-spin text-primary-600"
        [class]="size()"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  readonly size = input<'h-6 w-6' | 'h-8 w-8' | 'h-12 w-12'>('h-8 w-8');
}

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="animate-pulse space-y-3">
      <div class="h-4 rounded bg-slate-200 dark:bg-slate-800" style="width: 40%"></div>
      <div class="h-4 rounded bg-slate-200 dark:bg-slate-800" style="width: 85%"></div>
      <div class="h-40 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
      <div class="h-4 rounded bg-slate-200 dark:bg-slate-800" style="width: 70%"></div>
    </div>
  `,
})
export class SkeletonComponent {}