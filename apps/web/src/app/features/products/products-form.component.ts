import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule, Save, ArrowLeft, Plus, Trash2 } from 'lucide-angular';
import { DosageForms, type DosageForm } from '@pharmapro/shared';
import { ApiService } from '@core/services/api.service';
import { NotificationService } from '@core/services/notification.service';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { FormFieldComponent } from '@shared/components/form-field/form-field.component';
import { SelectSearchComponent, type SelectOption } from '@shared/components/select-search/select-search.component';

interface CategoryOption {
  id: string;
  name: string;
  children?: CategoryOption[];
}

@Component({
  selector: 'app-products-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, LucideAngularModule, PageHeaderComponent, FormFieldComponent, SelectSearchComponent],
  template: `
    <div class="space-y-4">
      <app-page-header
        [title]="(isEdit() ? 'PRODUCTS.edit' : 'PRODUCTS.new') | translate"
        [crumbs]="[('NAV.products' | translate), (isEdit() ? 'PRODUCTS.edit' : 'PRODUCTS.new') | translate]"
      >
        <a routerLink="/products" class="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          <lucide-angular [img]="ArrowLeft" class="h-4 w-4"></lucide-angular>
          {{ 'COMMON.back' | translate }}
        </a>
      </app-page-header>

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <app-form-field [label]="('PRODUCTS.name' | translate)" [required]="true" [control]="form.controls.name">
            <input type="text" formControlName="name" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.name_ar' | translate)" [control]="form.controls.nameAr">
            <input type="text" formControlName="nameAr" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.generic_name' | translate)" [control]="form.controls.genericName">
            <input type="text" formControlName="genericName" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.brand_name' | translate)" [control]="form.controls.brandName">
            <input type="text" formControlName="brandName" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.barcode' | translate)" [control]="form.controls.barcode">
            <input type="text" formControlName="barcode" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.sku' | translate)" [control]="form.controls.sku">
            <input type="text" formControlName="sku" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.category' | translate)" [control]="form.controls.categoryId">
            <app-select-search formControlName="categoryId" [options]="categoryOptions()" [placeholder]="('PRODUCTS.category' | translate)" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.manufacturer' | translate)" [control]="form.controls.manufacturerId">
            <app-select-search formControlName="manufacturerId" [options]="manufacturerOptions()" [placeholder]="('PRODUCTS.manufacturer' | translate)" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.dosage_form' | translate)" [control]="form.controls.dosageForm">
            <select formControlName="dosageForm" class="form-input">
              <option [ngValue]="null">{{ 'COMMON.none' | translate }}</option>
              @for (df of dosageForms; track df) {
                <option [ngValue]="df">{{ 'ENUMS.' + df | translate }}</option>
              }
            </select>
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.strength' | translate)" [control]="form.controls.strength">
            <input type="text" formControlName="strength" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.package_size' | translate)" [control]="form.controls.packageSize">
            <input type="text" formControlName="packageSize" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.unit' | translate)" [control]="form.controls.unit">
            <input type="text" formControlName="unit" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.purchase_price' | translate)" [control]="form.controls.purchasePrice">
            <input type="number" step="0.01" min="0" formControlName="purchasePrice" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.selling_price' | translate)" [required]="true" [control]="form.controls.sellingPrice">
            <input type="number" step="0.01" min="0" formControlName="sellingPrice" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.min_selling_price' | translate)" [control]="form.controls.minSellingPrice">
            <input type="number" step="0.01" min="0" formControlName="minSellingPrice" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.tax_rate' | translate)" [control]="form.controls.taxRate">
            <input type="number" step="0.01" min="0" max="100" formControlName="taxRate" class="form-input" />
          </app-form-field>
          <app-form-field [label]="('PRODUCTS.reorder_level' | translate)" [control]="form.controls.reorderLevel">
            <input type="number" step="1" min="0" formControlName="reorderLevel" class="form-input" />
          </app-form-field>
          <div class="flex items-center gap-2 pt-6">
            <input id="rx" type="checkbox" formControlName="prescriptionRequired" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <label for="rx" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'PRODUCTS.prescription_required' | translate }}</label>
          </div>
          @if (isEdit()) {
            <div class="flex items-center gap-2 pt-6">
              <input id="active" type="checkbox" formControlName="isActive" class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
              <label for="active" class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ 'PRODUCTS.is_active' | translate }}</label>
            </div>
          }
        </div>

        <app-form-field [label]="('PRODUCTS.description' | translate)" [control]="form.controls.description">
          <textarea formControlName="description" rows="2" class="form-input"></textarea>
        </app-form-field>
        <app-form-field [label]="('PRODUCTS.description_ar' | translate)" [control]="form.controls.descriptionAr">
          <textarea formControlName="descriptionAr" rows="2" class="form-input"></textarea>
        </app-form-field>
        <app-form-field [label]="('PRODUCTS.storage_instructions' | translate)" [control]="form.controls.storageInstructions">
          <textarea formControlName="storageInstructions" rows="2" class="form-input"></textarea>
        </app-form-field>

        <div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">{{ 'PRODUCTS.ingredients' | translate }}</h3>
            <button type="button" (click)="addIngredient()" class="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              <lucide-angular [img]="Plus" class="h-3.5 w-3.5"></lucide-angular>
              {{ 'PRODUCTS.add_ingredient' | translate }}
            </button>
          </div>
          <div formArrayName="ingredients" class="space-y-2">
            @for (group of ingredientGroups(); track $index) {
              <div [formGroupName]="$index" class="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_100px_auto]">
                <input type="text" formControlName="ingredientName" placeholder="{{ 'PRODUCTS.ingredient_name' | translate }}" class="form-input" />
                <input type="text" formControlName="strength" placeholder="{{ 'PRODUCTS.ingredient_strength' | translate }}" class="form-input" />
                <input type="text" formControlName="unit" placeholder="{{ 'PRODUCTS.unit' | translate }}" class="form-input" />
                <button type="button" (click)="removeIngredient($index)" class="self-start rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30">
                  <lucide-angular [img]="Trash2" class="h-4 w-4"></lucide-angular>
                </button>
              </div>
            } @empty {
              <p class="text-sm text-slate-400">{{ 'COMMON.empty.no_data' | translate }}</p>
            }
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <a routerLink="/products" class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            {{ 'COMMON.cancel' | translate }}
          </a>
          <button type="submit" [disabled]="form.invalid || saving()" class="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
            <lucide-angular [img]="Save" class="h-4 w-4"></lucide-angular>
            {{ saving() ? (this.isEdit() ? 'PRODUCTS.updated_success' : 'PRODUCTS.created_success') : ('COMMON.save' | translate) }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ProductsFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);

  readonly dosageForms: DosageForm[] = [...DosageForms];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    nameAr: [''],
    genericName: [''],
    brandName: [''],
    barcode: [''],
    sku: [''],
    categoryId: [null as string | null],
    manufacturerId: [null as string | null],
    dosageForm: [null as DosageForm | null],
    strength: [''],
    packageSize: [''],
    unit: ['piece'],
    purchasePrice: [0],
    sellingPrice: [0],
    minSellingPrice: [null as number | null],
    taxRate: [0],
    reorderLevel: [10],
    prescriptionRequired: [false],
    description: [''],
    descriptionAr: [''],
    storageInstructions: [''],
    isActive: [true],
    ingredients: this.fb.array<FormGroup>([]),
  });

  readonly categoryOptions = signal<SelectOption[]>([]);
  readonly manufacturerOptions = signal<SelectOption[]>([]);
  readonly saving = signal(false);

  protected readonly Plus = Plus;
  protected readonly Trash2 = Trash2;
  protected readonly Save = Save;
  protected readonly ArrowLeft = ArrowLeft;

  isEdit() {
    return !!this.route.snapshot.params['id'];
  }

  ngOnInit() {
    const id = this.route.snapshot.params['id'];
    this.loadCategories();
    this.loadManufacturers();
    if (id) this.loadProduct(id);
  }

  protected ingredientGroups() {
    return this.form.controls.ingredients.controls;
  }

  addIngredient() {
    this.form.controls.ingredients.push(this.fb.nonNullable.group({ ingredientName: '', strength: '', unit: '' }));
  }

  removeIngredient(index: number) {
    this.form.controls.ingredients.removeAt(index);
  }

  submit() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.buildPayload();
    const id = this.route.snapshot.params['id'];
    const request = id
      ? this.api.patch(`/products/${id}`, payload)
      : this.api.post('/products', payload);

    request.subscribe({
      next: () => {
        this.notifications.success(this.isEdit() ? 'PRODUCTS.updated_success' : 'PRODUCTS.created_success');
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.saving.set(false);
        this.notifications.error(this.extractError(err), 'COMMON.errors.operation_failed');
      },
    });
  }

  private loadProduct(id: string) {
    this.api.get<any>(`/products/${id}`).subscribe({
      next: (p) => {
        this.form.patchValue({
          name: p.name ?? '',
          nameAr: p.nameAr ?? '',
          genericName: p.genericName ?? '',
          brandName: p.brandName ?? '',
          barcode: p.barcode ?? '',
          sku: p.sku ?? '',
          categoryId: p.categoryId ?? null,
          manufacturerId: p.manufacturerId ?? null,
          dosageForm: p.dosageForm ?? null,
          strength: p.strength ?? '',
          packageSize: p.packageSize ?? '',
          unit: p.unit ?? 'piece',
          purchasePrice: p.purchasePrice ?? 0,
          sellingPrice: p.sellingPrice ?? 0,
          minSellingPrice: p.minSellingPrice ?? null,
          taxRate: p.taxRate ?? 0,
          reorderLevel: p.reorderLevel ?? 10,
          prescriptionRequired: p.prescriptionRequired ?? false,
          description: p.description ?? '',
          descriptionAr: p.descriptionAr ?? '',
          storageInstructions: p.storageInstructions ?? '',
          isActive: p.isActive ?? true,
        });
        this.form.controls.ingredients.clear();
        for (const ing of p.ingredients ?? []) {
          this.form.controls.ingredients.push(
            this.fb.nonNullable.group({ ingredientName: ing.ingredientName, strength: ing.strength ?? '', unit: ing.unit ?? '' }),
          );
        }
      },
    });
  }

  private buildPayload() {
    const raw = this.form.getRawValue();
    const compact = (v: string | null | undefined) => (v && v.trim() ? v.trim() : undefined);
    return {
      name: compact(raw.name),
      nameAr: compact(raw.nameAr),
      genericName: compact(raw.genericName),
      brandName: compact(raw.brandName),
      barcode: compact(raw.barcode),
      sku: compact(raw.sku),
      categoryId: raw.categoryId ?? undefined,
      manufacturerId: raw.manufacturerId ?? undefined,
      dosageForm: raw.dosageForm ?? undefined,
      strength: compact(raw.strength),
      packageSize: compact(raw.packageSize),
      unit: compact(raw.unit) ?? 'piece',
      purchasePrice: Number(raw.purchasePrice) || 0,
      sellingPrice: Number(raw.sellingPrice) || 0,
      minSellingPrice: raw.minSellingPrice == null ? undefined : Number(raw.minSellingPrice),
      taxRate: Number(raw.taxRate) || 0,
      reorderLevel: Number(raw.reorderLevel) || 0,
      prescriptionRequired: raw.prescriptionRequired,
      description: compact(raw.description),
      descriptionAr: compact(raw.descriptionAr),
      storageInstructions: compact(raw.storageInstructions),
      isActive: raw.isActive,
      ingredients: (raw.ingredients as Array<{ ingredientName: string; strength?: string; unit?: string }>)
        .filter((i) => i.ingredientName?.trim())
        .map((i) => ({
          ingredientName: i.ingredientName.trim(),
          strength: compact(i.strength),
          unit: compact(i.unit),
        })),
    };
  }

  private loadCategories() {
    this.api.get<CategoryOption[]>('/categories').subscribe({
      next: (tree) => {
        const flat: CategoryOption[] = [];
        const walk = (nodes: CategoryOption[]) => {
          for (const n of nodes) {
            flat.push(n);
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        this.categoryOptions.set(flat.map((c) => ({ value: c.id, label: c.name })));
      },
      error: () => undefined,
    });
  }

  private loadManufacturers() {
    this.api.get<Array<{ id: string; name: string }>>('/manufacturers/options').subscribe({
      next: (list) => this.manufacturerOptions.set(list.map((m) => ({ value: m.id, label: m.name }))),
      error: () => undefined,
    });
  }

  private extractError(err: any): string {
    return err?.error?.message ?? 'COMMON.errors.operation_failed';
  }
}