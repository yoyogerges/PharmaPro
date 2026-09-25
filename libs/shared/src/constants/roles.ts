import type { PermissionSlug } from './permissions.js';

export interface RoleDefinition {
  name: string;
  displayName: string;
  description: string;
  isSystem: boolean;
}

export const DEFAULT_ROLES: RoleDefinition[] = [
  { name: 'admin', displayName: 'Admin', description: 'Full system administration', isSystem: true },
  { name: 'manager', displayName: 'Pharmacy Manager', description: 'Manage pharmacy operations', isSystem: true },
  { name: 'pharmacist', displayName: 'Pharmacist', description: 'Medication dispensing and prescriptions', isSystem: false },
  { name: 'cashier', displayName: 'Cashier', description: 'POS and sales operations', isSystem: false },
  { name: 'inventory_manager', displayName: 'Inventory Manager', description: 'Stock and inventory management', isSystem: false },
  { name: 'purchasing', displayName: 'Purchasing Officer', description: 'Purchase orders and receiving', isSystem: false },
  { name: 'accountant', displayName: 'Accountant', description: 'Finance, payments and reports', isSystem: false },
  { name: 'viewer', displayName: 'Viewer', description: 'Read-only access', isSystem: false },
];

export const ROLE_NAMES = DEFAULT_ROLES.map((r) => r.name) as readonly string[];

export type RoleName = (typeof ROLE_NAMES)[number];

/**
 * Role → Permission assignment matching the permission matrix in the
 * master plan. `'view'` = the module's `*.view` permission only.
 */
export const ROLE_PERMISSIONS: Record<RoleName, PermissionSlug[]> = {
  admin: [
    'dashboard.view',
    'products.view', 'products.create', 'products.update', 'products.delete', 'products.export',
    'categories.view', 'categories.create', 'categories.update', 'categories.delete',
    'manufacturers.view', 'manufacturers.create', 'manufacturers.update', 'manufacturers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'employees.view', 'employees.create', 'employees.update', 'employees.delete',
    'inventory.view', 'inventory.adjust', 'inventory.approve_adjustment',
    'batches.view',
    'sales.view', 'sales.create', 'sales.return', 'sales.export',
    'purchases.view', 'purchases.create', 'purchases.approve', 'purchases.receive', 'purchases.return',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.update', 'prescriptions.dispense',
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.approve',
    'payments.view', 'payments.create',
    'cash_register.view', 'cash_register.open', 'cash_register.close',
    'reports.view', 'reports.export',
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
    'notifications.view',
    'documents.view', 'documents.upload', 'documents.delete',
    'audit.view',
    'settings.view', 'settings.update',
    'search.global',
  ],
  manager: [
    'dashboard.view',
    'products.view', 'products.create', 'products.update', 'products.delete', 'products.export',
    'categories.view', 'categories.create', 'categories.update', 'categories.delete',
    'manufacturers.view', 'manufacturers.create', 'manufacturers.update', 'manufacturers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'employees.view', 'employees.create', 'employees.update', 'employees.delete',
    'inventory.view', 'inventory.adjust', 'inventory.approve_adjustment',
    'batches.view',
    'sales.view', 'sales.create', 'sales.return', 'sales.export',
    'purchases.view', 'purchases.create', 'purchases.approve', 'purchases.receive', 'purchases.return',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.update', 'prescriptions.dispense',
    'expenses.view', 'expenses.create', 'expenses.update', 'expenses.approve',
    'payments.view', 'payments.create',
    'cash_register.view', 'cash_register.open', 'cash_register.close',
    'reports.view', 'reports.export',
    'users.view',
    'notifications.view',
    'documents.view', 'documents.upload', 'documents.delete',
    'audit.view',
    'settings.view',
    'search.global',
  ],
  pharmacist: [
    'dashboard.view',
    'products.view',
    'customers.view', 'customers.create', 'customers.update',
    'inventory.view',
    'batches.view',
    'sales.view', 'sales.create', 'sales.return',
    'prescriptions.view', 'prescriptions.create', 'prescriptions.update', 'prescriptions.dispense',
    'cash_register.view', 'cash_register.open', 'cash_register.close',
    'notifications.view',
    'search.global',
  ],
  cashier: [
    'dashboard.view',
    'products.view',
    'customers.view',
    'batches.view',
    'sales.view', 'sales.create',
    'prescriptions.view',
    'cash_register.view', 'cash_register.open', 'cash_register.close',
    'notifications.view',
  ],
  inventory_manager: [
    'dashboard.view',
    'products.view', 'products.create', 'products.update', 'products.export',
    'categories.view', 'categories.create', 'categories.update',
    'manufacturers.view', 'manufacturers.create', 'manufacturers.update',
    'suppliers.view',
    'inventory.view', 'inventory.adjust',
    'batches.view',
    'purchases.view', 'purchases.receive', 'purchases.return',
    'notifications.view',
    'search.global',
  ],
  purchasing: [
    'dashboard.view',
    'products.view',
    'suppliers.view', 'suppliers.create', 'suppliers.update',
    'inventory.view',
    'purchases.view', 'purchases.create', 'purchases.receive', 'purchases.return',
    'notifications.view',
    'search.global',
  ],
  accountant: [
    'dashboard.view',
    'sales.view', 'sales.export',
    'purchases.view',
    'expenses.view', 'expenses.create', 'expenses.update',
    'payments.view', 'payments.create',
    'cash_register.view', 'cash_register.open', 'cash_register.close',
    'reports.view', 'reports.export',
    'notifications.view',
  ],
  viewer: [
    'dashboard.view',
    'products.view',
    'categories.view',
    'manufacturers.view',
    'suppliers.view',
    'customers.view',
    'inventory.view',
    'batches.view',
    'sales.view',
    'purchases.view',
    'prescriptions.view',
    'expenses.view',
    'payments.view',
    'cash_register.view',
    'reports.view',
    'notifications.view',
  ],
};

export const enumToPermissionList = (roleName: RoleName): PermissionSlug[] => ROLE_PERMISSIONS[roleName];

