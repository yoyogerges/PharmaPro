import type {
  CashMovementType,
  CashSessionStatus,
  ExpenseStatus,
  PaymentMethod,
  PaymentType,
} from './enums.js';

export interface ExpenseCategory {
  id: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  expenseCategoryId?: string | null;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string | null;
  attachmentUrl?: string | null;
  userId: string;
  approvedById?: string | null;
  status: ExpenseStatus;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; nameAr?: string | null } | null;
  createdBy?: { id: string; firstName: string; lastName: string } | null;
  approvedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface Payment {
  id: string;
  type: PaymentType;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  expenseId?: string | null;
  saleId?: string | null;
  userId: string;
  notes?: string | null;
  createdAt: string;
  customer?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  expense?: { id: string; description?: string | null } | null;
  user?: { id: string; firstName: string; lastName: string } | null;
}

export interface CashRegister {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface CashSession {
  id: string;
  cashRegisterId: string;
  userId: string;
  openingBalance: number;
  closingBalance?: number | null;
  expectedClosingBalance?: number | null;
  openedAt: string;
  closedAt?: string | null;
  status: CashSessionStatus;
  notes?: string | null;
  cashRegister?: { id: string; name: string } | null;
  user?: { id: string; firstName: string; lastName: string } | null;
  movements?: CashMovement[];
}

export interface CashMovement {
  id: string;
  cashSessionId: string;
  type: CashMovementType;
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

