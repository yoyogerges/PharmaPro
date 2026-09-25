import { AfterViewInit, Component, ElementRef, input, signal } from '@angular/core';
import { type AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="relative">
      @if (label()) {
        <label [attr.for]="fieldId() || null" class="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {{ label() }}
          @if (required()) {
            <span class="text-red-500">*</span>
          }
        </label>
      }
      <ng-content />
      @if (control() && errorKey()) {
        <p class="mt-1 text-xs font-medium text-red-500">{{ errorKey() | translate }}</p>
      }
      @if (hint()) {
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ hint() }}</p>
      }
    </div>
  `,
})
export class FormFieldComponent implements AfterViewInit {
  readonly label = input<string>();
  readonly hint = input<string>();
  readonly required = input(false);
  readonly control = input<AbstractControl | null>(null);
  readonly forId = input<string>();

  constructor(private readonly hostEl: ElementRef<HTMLElement>) {}

  protected readonly fieldId = signal<string | null>(null);

  static nextId = 0;

  ngAfterViewInit(): void {
    const el = this.hostEl.nativeElement.querySelector('input, select, textarea');
    if (!el) return;
    FormFieldComponent.nextId += 1;
    const id = this.forId() || el.id || `ff-${FormFieldComponent.nextId}`;
    el.id = id;
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (!el.name) el.name = el.id;
    }
    this.fieldId.set(id);
  }

  errorKey(): string | null {
    const control = this.control();
    if (!control || !control.invalid || !(control.touched || control.dirty)) return null;
    if (control.hasError('required')) return 'COMMON.validation.required';
    if (control.hasError('email')) return 'COMMON.validation.email';
    if (control.hasError('minlength')) return 'COMMON.validation.min_length';
    if (control.hasError('pattern')) return 'COMMON.validation.pattern';
    if (control.hasError('min')) return 'COMMON.validation.min';
    if (control.hasError('max')) return 'COMMON.validation.max';
    return 'COMMON.validation.invalid';
  }
}