import { Component, input, output, signal } from '@angular/core';
import { LucideAngularModule, Upload, X } from 'lucide-angular';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div
      (dragover)="dragOver.set(true)"
      (dragleave)="dragOver.set(false)"
      (drop)="onDrop($event)"
      class="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-primary-400 dark:border-slate-700"
      [class.border-primary-400.bg-primary-50.dark:bg-primary-900/20]="dragOver()"
      (click)="fileInput.click()"
    >
      <input
        #fileInput
        type="file"
        class="hidden"
        [accept]="accept()"
        (change)="onFiles($event)"
      />
      <lucide-angular [img]="Upload" class="mb-2 h-7 w-7 text-slate-400"></lucide-angular>
      @if (file()) {
        <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <span>{{ file()!.name }}</span>
          <button type="button" (click)="clear($event)" class="text-slate-400 hover:text-red-500">
            <lucide-angular [img]="X" class="h-4 w-4"></lucide-angular>
          </button>
        </div>
      } @else {
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ hint() }}</p>
        <p class="mt-1 text-xs text-slate-400">{{ acceptHint() }}</p>
      }
    </div>
  `,
})
export class FileUploadComponent {
  readonly accept = input('*/*');
  readonly hint = input('UPLOAD.hint');
  readonly acceptHint = input('UPLOAD.accepted');
  readonly fileSelected = output<File | null>();

  readonly file = signal<File | null>(null);
  readonly dragOver = signal(false);

  onFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.file.set(input.files[0]);
      this.fileSelected.emit(input.files[0]);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    const f = event.dataTransfer?.files?.[0];
    if (f) {
      this.file.set(f);
      this.fileSelected.emit(f);
    }
  }

  clear(event: Event) {
    event.stopPropagation();
    this.file.set(null);
    this.fileSelected.emit(null);
  }

  protected readonly Upload = Upload;
  protected readonly X = X;
}