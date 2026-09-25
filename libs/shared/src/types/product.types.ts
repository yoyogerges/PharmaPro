import type { DosageForm } from './enums.js';

export interface ProductCategory {
  id: string;
  name: string;
  nameAr?: string | null;
  parentId?: string | null;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  children?: ProductCategory[];
}

export interface Manufacturer {
  id: string;
  name: string;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

export interface ProductIngredient {
  id: string;
  productId: string;
  ingredientName: string;
  strength?: string | null;
  unit?: string | null;
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string | null;
  genericName?: string | null;
  brandName?: string | null;
  barcode?: string | null;
  sku?: string | null;
  categoryId?: string | null;
  manufacturerId?: string | null;
  dosageForm?: DosageForm | null;
  strength?: string | null;
  packageSize?: string | null;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minSellingPrice?: number | null;
  taxRate: number;
  reorderLevel: number;
  prescriptionRequired: boolean;
  description?: string | null;
  descriptionAr?: string | null;
  storageInstructions?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  category?: ProductCategory | null;
  manufacturer?: Manufacturer | null;
  ingredients?: ProductIngredient[];
  stockQuantity?: number;
  totalQuantity?: number;
}

