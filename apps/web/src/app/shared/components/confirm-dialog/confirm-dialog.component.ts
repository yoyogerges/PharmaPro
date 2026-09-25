import { inject, Injectable } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { Component, input, output } from '@angular/core';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone?: 'danger' | 'primary';
}

@Component({
  selector: 'app-confirm-dialog-content',
  standalone: true,
  template: `
    <div class="min-w-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <h3 class="text-base font-semibold text-slate-900 dark:text-white">{{ data().title }}</h3>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ data().message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          (click)="closed.emit(false)"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {{ data().cancelText }}
        </button>
        <button
          type="button"
          (click)="closed.emit(true)"
          class="rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          [class]="data().tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'"
        >
          {{ data().confirmText }}
        </button>
      </div>
    </div>
  `,
})
export class ConfirmDialogContentComponent {
  readonly data = input.required<ConfirmDialogData>();
  readonly closed = output<boolean>();
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(Dialog);

  confirm(
    title: string,
    message: string,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone: 'danger' | 'primary' = 'primary',
  ): Promise<boolean> {
    const ref = this.dialog.open(ConfirmDialogContentComponent, {
      data: { title, message, confirmText, cancelText, tone } satisfies ConfirmDialogData,
    });
    return new Promise<boolean>((resolve) => {
      ref.closed.subscribe((result) => resolve(result === true));
    });
  }
}