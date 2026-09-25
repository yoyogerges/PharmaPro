import type { PaymentMethod, PaymentStatus, SaleStatus } from './enums';

export interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  customerId?: string | null;
  prescriptionId?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  cashierId: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  cashier?: { id: string; firstName: string; lastName: string } | null;
  items?: SaleItem[];
  payments?: SalePayment[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  batchId?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  totalPrice: number;
  product?: { id: string; name: string; barcode?: string | null } | null;
  batch?: { id: string; batchNumber: string; expiryDate: string } | null;
}

export interface SalePayment {
  id: string;
  saleId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  reference?: string | null;
  createdAt: string;
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  batchId?: string;
  unitPrice?: number;
  discount?: number;
}

export interface CreateSaleInput {
  customerId?: string;
  prescriptionId?: string;
  items: CreateSaleItemInput[];
  payments: { paymentMethod: PaymentMethod; amount: number; reference?: string }[];
  discountAmount?: number;
  notes?: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  saleId: string;
  returnDate: string;
  customerId?: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  refundMethod?: PaymentMethod | null;
  reason?: string | null;
  status: string;
  returnedById: string;
  notes?: string | null;
  createdAt: string;
  sale?: { id: string; invoiceNumber: string; saleDate: string } | null;
  items?: SalesReturnItem[];
}

export interface SalesReturnItem {
  id: string;
  salesReturnId: string;
  saleItemId: string;
  productId: string;
  batchId?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  reason?: string | null;
  product?: { id: string; name: string } | null;
}