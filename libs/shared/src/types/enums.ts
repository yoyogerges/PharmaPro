export const UserStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof UserStatuses)[number];

export const DosageForms = [
  'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'CREAM', 'OINTMENT',
  'GEL', 'DROPS', 'INHALER', 'SUPPOSITORY', 'PATCH', 'POWDER',
  'SOLUTION', 'SUSPENSION', 'SPRAY', 'OTHER',
] as const;
export type DosageForm = (typeof DosageForms)[number];

export const InventoryMovementTypes = [
  'PURCHASE', 'SALE', 'SALE_RETURN', 'PURCHASE_RETURN',
  'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT',
  'EXPIRED_WRITE_OFF',
] as const;
export type InventoryMovementType = (typeof InventoryMovementTypes)[number];

export const StockAdjustmentStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type StockAdjustmentStatus = (typeof StockAdjustmentStatuses)[number];

export const PurchaseOrderStatuses = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ORDERED',
  'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED',
] as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatuses)[number];

export const SaleStatuses = ['COMPLETED', 'RETURNED', 'PARTIALLY_RETURNED', 'CANCELLED'] as const;
export type SaleStatus = (typeof SaleStatuses)[number];

export const PaymentStatuses = ['PAID', 'PARTIALLY_PAID', 'UNPAID', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PaymentStatuses)[number];

export const PaymentMethods = ['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'OTHER'] as const;
export type PaymentMethod = (typeof PaymentMethods)[number];

export const PaymentTypes = [
  'CUSTOMER_PAYMENT', 'SUPPLIER_PAYMENT', 'EXPENSE_PAYMENT',
  'SALE_REFUND', 'PURCHASE_REFUND',
] as const;
export type PaymentType = (typeof PaymentTypes)[number];

export const PrescriptionStatuses = ['PENDING', 'PARTIALLY_DISPENSED', 'DISPENSED', 'CANCELLED'] as const;
export type PrescriptionStatus = (typeof PrescriptionStatuses)[number];

export const CashSessionStatuses = ['OPEN', 'CLOSED'] as const;
export type CashSessionStatus = (typeof CashSessionStatuses)[number];

export const CashMovementTypes = [
  'SALE', 'SALE_REFUND', 'EXPENSE', 'DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT',
] as const;
export type CashMovementType = (typeof CashMovementTypes)[number];

export const ExpenseStatuses = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ExpenseStatus = (typeof ExpenseStatuses)[number];

export const NotificationTypes = [
  'LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED', 'PENDING_APPROVAL',
  'PURCHASE_REQUEST', 'SYSTEM', 'INFO', 'WARNING', 'ERROR',
] as const;
export type NotificationType = (typeof NotificationTypes)[number];