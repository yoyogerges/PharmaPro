import type { InventoryMovementType, StockAdjustmentStatus } from './enums';

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  remainingQuantity: number;
  supplierId?: string | null;
  purchaseReceiptId?: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku?: string | null; barcode?: string | null } | null;
  supplier?: { id: string; name: string } | null;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  batchId?: string | null;
  type: InventoryMovementType;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  userId?: string | null;
  createdAt: string;
  product?: { id: string; name: string; sku?: string | null } | null;
  batch?: { id: string; batchNumber: string; expiryDate: string } | null;
  user?: { id: string; firstName: string; lastName: string } | null;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  batchId?: string | null;
  type: InventoryMovementType;
  quantity: number;
  reason: string;
  notes?: string | null;
  adjustedById: string;
  approvedById?: string | null;
  status: StockAdjustmentStatus;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; sku?: string | null } | null;
  batch?: { id: string; batchNumber: string } | null;
  adjustedBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface StockLevel {
  productId: string;
  name: string;
  nameAr?: string | null;
  sku?: string | null;
  barcode?: string | null;
  category?: string | null;
  totalQuantity: number;
  totalBatches: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  stockValue: number;
  isLowStock: boolean;
}

export interface ExpiryInfo {
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  expiryDate: string;
  remainingQuantity: number;
  daysToExpiry: number;
  status: 'EXPIRED' | 'NEAR_EXPIRY' | 'OK';
}