/**
 * Canonical permission registry. Each entry: `module.action`.
 * Order matches the permission matrix in the master plan.
 */
export const PERMISSIONS = [
  // dashboard
  'dashboard.view',
  // products
  'products.view',
  'products.create',
  'products.update',
  'products.delete',
  'products.export',
  // categories
  'categories.view',
  'categories.create',
  'categories.update',
  'categories.delete',
  // manufacturers
  'manufacturers.view',
  'manufacturers.create',
  'manufacturers.update',
  'manufacturers.delete',
  // suppliers
  'suppliers.view',
  'suppliers.create',
  'suppliers.update',
  'suppliers.delete',
  // customers
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',
  // employees
  'employees.view',
  'employees.create',
  'employees.update',
  'employees.delete',
  // inventory
  'inventory.view',
  'inventory.adjust',
  'inventory.approve_adjustment',
  // batches
  'batches.view',
  // sales
  'sales.view',
  'sales.create',
  'sales.return',
  'sales.export',
  // purchases
  'purchases.view',
  'purchases.create',
  'purchases.approve',
  'purchases.receive',
  'purchases.return',
  // prescriptions
  'prescriptions.view',
  'prescriptions.create',
  'prescriptions.update',
  'prescriptions.dispense',
  // expenses
  'expenses.view',
  'expenses.create',
  'expenses.update',
  'expenses.approve',
  // payments
  'payments.view',
  'payments.create',
  // cash register
  'cash_register.view',
  'cash_register.open',
  'cash_register.close',
  // reports
  'reports.view',
  'reports.export',
  // users
  'users.view',
  'users.create',
  'users.update',
  'users.delete',
  // roles
  'roles.view',
  'roles.create',
  'roles.update',
  'roles.delete',
  // notifications
  'notifications.view',
  // documents
  'documents.view',
  'documents.upload',
  'documents.delete',
  // audit
  'audit.view',
  // settings
  'settings.view',
  'settings.update',
  // search
  'search.global',
] as const;

export type PermissionSlug = (typeof PERMISSIONS)[number];

export interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  displayName: string;
  description: string;
}

/**
 * Permission definitions grouped by module — used to seed the
 * `permissions` table and to render the UI permission matrix.
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: 'dashboard.view', module: 'dashboard', action: 'view', displayName: 'View Dashboard', description: 'Access the dashboard' },
  { key: 'products.view', module: 'products', action: 'view', displayName: 'View Products', description: 'Browse product catalog' },
  { key: 'products.create', module: 'products', action: 'create', displayName: 'Create Products', description: 'Add new products' },
  { key: 'products.update', module: 'products', action: 'update', displayName: 'Update Products', description: 'Edit existing products' },
  { key: 'products.delete', module: 'products', action: 'delete', displayName: 'Delete Products', description: 'Remove products' },
  { key: 'products.export', module: 'products', action: 'export', displayName: 'Export Products', description: 'Export the product catalog' },
  { key: 'categories.view', module: 'categories', action: 'view', displayName: 'View Categories', description: 'Browse categories' },
  { key: 'categories.create', module: 'categories', action: 'create', displayName: 'Create Categories', description: 'Add new categories' },
  { key: 'categories.update', module: 'categories', action: 'update', displayName: 'Update Categories', description: 'Edit categories' },
  { key: 'categories.delete', module: 'categories', action: 'delete', displayName: 'Delete Categories', description: 'Remove categories' },
  { key: 'manufacturers.view', module: 'manufacturers', action: 'view', displayName: 'View Manufacturers', description: 'Browse manufacturers' },
  { key: 'manufacturers.create', module: 'manufacturers', action: 'create', displayName: 'Create Manufacturers', description: 'Add manufacturers' },
  { key: 'manufacturers.update', module: 'manufacturers', action: 'update', displayName: 'Update Manufacturers', description: 'Edit manufacturers' },
  { key: 'manufacturers.delete', module: 'manufacturers', action: 'delete', displayName: 'Delete Manufacturers', description: 'Remove manufacturers' },
  { key: 'suppliers.view', module: 'suppliers', action: 'view', displayName: 'View Suppliers', description: 'Browse suppliers' },
  { key: 'suppliers.create', module: 'suppliers', action: 'create', displayName: 'Create Suppliers', description: 'Add suppliers' },
  { key: 'suppliers.update', module: 'suppliers', action: 'update', displayName: 'Update Suppliers', description: 'Edit suppliers' },
  { key: 'suppliers.delete', module: 'suppliers', action: 'delete', displayName: 'Delete Suppliers', description: 'Remove suppliers' },
  { key: 'customers.view', module: 'customers', action: 'view', displayName: 'View Customers', description: 'Browse customers' },
  { key: 'customers.create', module: 'customers', action: 'create', displayName: 'Create Customers', description: 'Add customers' },
  { key: 'customers.update', module: 'customers', action: 'update', displayName: 'Update Customers', description: 'Edit customers' },
  { key: 'customers.delete', module: 'customers', action: 'delete', displayName: 'Delete Customers', description: 'Remove customers' },
  { key: 'employees.view', module: 'employees', action: 'view', displayName: 'View Employees', description: 'Browse employees' },
  { key: 'employees.create', module: 'employees', action: 'create', displayName: 'Create Employees', description: 'Add employees' },
  { key: 'employees.update', module: 'employees', action: 'update', displayName: 'Update Employees', description: 'Edit employees' },
  { key: 'employees.delete', module: 'employees', action: 'delete', displayName: 'Delete Employees', description: 'Remove employees' },
  { key: 'inventory.view', module: 'inventory', action: 'view', displayName: 'View Inventory', description: 'View stock levels' },
  { key: 'inventory.adjust', module: 'inventory', action: 'adjust', displayName: 'Adjust Stock', description: 'Create stock adjustments' },
  { key: 'inventory.approve_adjustment', module: 'inventory', action: 'approve_adjustment', displayName: 'Approve Adjustments', description: 'Approve or reject stock adjustments' },
  { key: 'batches.view', module: 'batches', action: 'view', displayName: 'View Batches', description: 'Browse product batches' },
  { key: 'sales.view', module: 'sales', action: 'view', displayName: 'View Sales', description: 'Browse sales & invoices' },
  { key: 'sales.create', module: 'sales', action: 'create', displayName: 'Create Sales', description: 'Process sales at POS' },
  { key: 'sales.return', module: 'sales', action: 'return', displayName: 'Process Returns', description: 'Create sales returns' },
  { key: 'sales.export', module: 'sales', action: 'export', displayName: 'Export Sales', description: 'Export sales data' },
  { key: 'purchases.view', module: 'purchases', action: 'view', displayName: 'View Purchases', description: 'Browse purchase orders' },
  { key: 'purchases.create', module: 'purchases', action: 'create', displayName: 'Create Purchases', description: 'Create purchase orders' },
  { key: 'purchases.approve', module: 'purchases', action: 'approve', displayName: 'Approve Purchases', description: 'Approve purchase orders' },
  { key: 'purchases.receive', module: 'purchases', action: 'receive', displayName: 'Receive Purchases', description: 'Receive purchase deliveries' },
  { key: 'purchases.return', module: 'purchases', action: 'return', displayName: 'Return Purchases', description: 'Create purchase returns' },
  { key: 'prescriptions.view', module: 'prescriptions', action: 'view', displayName: 'View Prescriptions', description: 'Browse prescriptions' },
  { key: 'prescriptions.create', module: 'prescriptions', action: 'create', displayName: 'Create Prescriptions', description: 'Add prescriptions' },
  { key: 'prescriptions.update', module: 'prescriptions', action: 'update', displayName: 'Update Prescriptions', description: 'Edit prescriptions' },
  { key: 'prescriptions.dispense', module: 'prescriptions', action: 'dispense', displayName: 'Dispense', description: 'Dispense prescribed medicines' },
  { key: 'expenses.view', module: 'expenses', action: 'view', displayName: 'View Expenses', description: 'Browse expenses' },
  { key: 'expenses.create', module: 'expenses', action: 'create', displayName: 'Create Expenses', description: 'Add expenses' },
  { key: 'expenses.update', module: 'expenses', action: 'update', displayName: 'Update Expenses', description: 'Edit expenses' },
  { key: 'expenses.approve', module: 'expenses', action: 'approve', displayName: 'Approve Expenses', description: 'Approve or reject expenses' },
  { key: 'payments.view', module: 'payments', action: 'view', displayName: 'View Payments', description: 'Browse payment transactions' },
  { key: 'payments.create', module: 'payments', action: 'create', displayName: 'Create Payments', description: 'Record payments' },
  { key: 'cash_register.view', module: 'cash_register', action: 'view', displayName: 'View Cash Register', description: 'View cash register' },
  { key: 'cash_register.open', module: 'cash_register', action: 'open', displayName: 'Open Session', description: 'Open a cash session' },
  { key: 'cash_register.close', module: 'cash_register', action: 'close', displayName: 'Close Session', description: 'Close a cash session' },
  { key: 'reports.view', module: 'reports', action: 'view', displayName: 'View Reports', description: 'Access reports' },
  { key: 'reports.export', module: 'reports', action: 'export', displayName: 'Export Reports', description: 'Export report data' },
  { key: 'users.view', module: 'users', action: 'view', displayName: 'View Users', description: 'Browse system users' },
  { key: 'users.create', module: 'users', action: 'create', displayName: 'Create Users', description: 'Add system users' },
  { key: 'users.update', module: 'users', action: 'update', displayName: 'Update Users', description: 'Edit system users' },
  { key: 'users.delete', module: 'users', action: 'delete', displayName: 'Delete Users', description: 'Remove system users' },
  { key: 'roles.view', module: 'roles', action: 'view', displayName: 'View Roles', description: 'Browse roles' },
  { key: 'roles.create', module: 'roles', action: 'create', displayName: 'Create Roles', description: 'Add roles' },
  { key: 'roles.update', module: 'roles', action: 'update', displayName: 'Update Roles', description: 'Edit roles & permissions' },
  { key: 'roles.delete', module: 'roles', action: 'delete', displayName: 'Delete Roles', description: 'Remove roles' },
  { key: 'notifications.view', module: 'notifications', action: 'view', displayName: 'View Notifications', description: 'View notifications' },
  { key: 'documents.view', module: 'documents', action: 'view', displayName: 'View Documents', description: 'View documents' },
  { key: 'documents.upload', module: 'documents', action: 'upload', displayName: 'Upload Documents', description: 'Upload documents' },
  { key: 'documents.delete', module: 'documents', action: 'delete', displayName: 'Delete Documents', description: 'Remove documents' },
  { key: 'audit.view', module: 'audit', action: 'view', displayName: 'View Audit Log', description: 'View audit trails' },
  { key: 'settings.view', module: 'settings', action: 'view', displayName: 'View Settings', description: 'View system settings' },
  { key: 'settings.update', module: 'settings', action: 'update', displayName: 'Update Settings', description: 'Modify system settings' },
  { key: 'search.global', module: 'search', action: 'global', displayName: 'Global Search', description: 'Use global search' },
];

export const PERMISSION_MODULES = Array.from(
  new Set(PERMISSION_DEFINITIONS.map((p) => p.module)),
);

