import { Directive, ElementRef, inject, Input, type OnDestroy } from '@angular/core';

@Directive({ selector: '[appClickOutside]', standalone: true })
export class ClickOutsideDirective implements OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private listener = (event: Event) => this.onClick(event);

  @Input() appClickOutside!: () => void;
  @Input() appClickOutsideInclude: HTMLElement[] = [];

  constructor() {
    document.addEventListener('mousedown', this.listener);
  }

  private onClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target) return;
    if (this.elementRef.nativeElement.contains(target)) return;
    if (this.appClickOutsideInclude.some((el) => el.contains(target))) return;
    this.appClickOutside();
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.listener);
  }
}