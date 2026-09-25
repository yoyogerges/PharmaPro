import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
}

const typeStyles: Record<ToastType, string> = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  warning: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  info: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  private push(type: ToastType, message: string, title?: string, duration = 4000) {
    const id = Date.now() + Math.random();
    const toast: Toast = { id, type, message, title, duration };
    this.toasts.update((t) => [...t, toast]);
    setTimeout(() => this.remove(id), duration);
  }

  remove(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }

  success(message: string, title?: string) {
    this.push('success', message, title);
  }

  error(message: string, title?: string, duration = 6000) {
    this.push('error', message, title, duration);
  }

  warning(message: string, title?: string, duration = 5000) {
    this.push('warning', message, title, duration);
  }

  info(message: string, title?: string) {
    this.push('info', message, title);
  }

  static styleOf(type: ToastType): string {
    return typeStyles[type];
  }
}