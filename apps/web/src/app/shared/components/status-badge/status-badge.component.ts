import { Component, computed, input } from '@angular/core';

export type BadgeTone = 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'violet';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="badgeClass()"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<BadgeTone>('slate');

  protected readonly badgeClass = computed(() => {
    const map: Record<BadgeTone, string> = {
      green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
      amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
      violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
      slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    };
    return map[this.tone()];
  });
}

const TONE_BY_STATUS: Record<string, BadgeTone> = {
  ACTIVE: 'green', COMPLETED: 'green', PAID: 'green', APPROVED: 'green',
  OPEN: 'green', DISPENSED: 'green', RECEIVED: 'green',
  PENDING: 'amber', PENDING_APPROVAL: 'amber', PARTIALLY_PAID: 'amber',
  PARTIALLY_RECEIVED: 'amber', PARTIALLY_DISPENSED: 'amber', PARTIALLY_RETURNED: 'amber',
  DRAFT: 'slate', ORDERED: 'blue', 
  REJECTED: 'red', CANCELLED: 'red', UNPAID: 'red', SUSPENDED: 'red',
  INACTIVE: 'slate', RETURNED: 'violet',
};

export function toneForStatus(status: string): BadgeTone {
  return TONE_BY_STATUS[status] ?? 'slate';
}