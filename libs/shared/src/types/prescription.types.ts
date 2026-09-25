import type { PrescriptionStatus } from './enums.js';

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  customerId: string;
  doctorName?: string | null;
  doctorPhone?: string | null;
  issueDate: string;
  status: PrescriptionStatus;
  notes?: string | null;
  dispensedById?: string | null;
  dispensedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string; phone?: string | null } | null;
  dispensedBy?: { id: string; firstName: string; lastName: string } | null;
  items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  productId: string;
  quantity: number;
  dosageInstructions?: string | null;
  dispensedQuantity: number;
  notes?: string | null;
  product?: {
    id: string;
    name: string;
    sellingPrice: number;
    prescriptionRequired: boolean;
    sku?: string | null;
  } | null;
}

export interface CreatePrescriptionItem {
  productId: string;
  quantity: number;
  dosageInstructions?: string;
  notes?: string;
}

export interface CreatePrescriptionInput {
  customerId: string;
  doctorName?: string;
  doctorPhone?: string;
  issueDate: string;
  notes?: string;
  items: CreatePrescriptionItem[];
}

export interface DispenseInput {
  items: { prescriptionItemId: string; quantity: number }[];
  notes?: string;
}

