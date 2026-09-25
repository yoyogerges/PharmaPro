import type { PurchaseOrderStatus } from './enums';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string; phone?: string | null } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  totalPrice: number;
  product?: { id: string; name: string; sku?: string | null; barcode?: string | null } | null;
}

export interface CreatePurchaseOrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: CreatePurchaseOrderItem[];
  discountAmount?: number;
  notes?: string;
}

export interface PurchaseReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string | null;
  supplierId: string;
  receiptDate: string;
  receivedById: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  supplier?: { id: string; name: string } | null;
  receivedBy?: { id: string; firstName: string; lastName: string } | null;
  items?: PurchaseReceiptItem[];
}

export interface PurchaseReceiptItem {
  id: string;
  purchaseReceiptId: string;
  purchaseOrderItemId?: string | null;
  productId: string;
  receivedQuantity: number;
  unitPrice: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
  totalPrice: number;
  product?: { id: string; name: string } | null;
}

export interface CreateReceiptItem {
  productId: string;
  purchaseOrderItemId?: string;
  receivedQuantity: number;
  unitPrice: number;
  batchNumber: string;
  expiryDate: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseReceiptId?: string | null;
  supplierId: string;
  returnDate: string;
  reason?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  returnedById: string;
  notes?: string | null;
  createdAt: string;
  supplier?: { id: string; name: string } | null;
  items?: PurchaseReturnListItem[];
}

export interface PurchaseReturnListItem {
  id: string;
  purchaseReturnId: string;
  productId: string;
  batchId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string | null;
  product?: { id: string; name: string } | null;
  batch?: { id: string; batchNumber: string } | null;
}