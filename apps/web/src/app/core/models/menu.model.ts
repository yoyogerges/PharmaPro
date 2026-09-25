import type { AuthUser } from '@pharmapro/shared';
import type { LucideIconData } from 'lucide-angular';
import {
  Banknote,
  Bell,
  Boxes,
  CalendarX,
  ChartBar,
  ClipboardPlus,
  CreditCard,
  Factory,
  FileText,
  FolderTree,
  Layers,
  Layers2,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  PackageX,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  Undo2,
  UserCog,
  UserRound,
  Users,
  Vault,
} from 'lucide-angular';

/** Chainable query-builder describing a persisted list query. */
export interface TableQueryState {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
  filters: Record<string, unknown>;
}

export function emptyTableQuery(): TableQueryState {
  return { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', search: '', filters: {} };
}

export interface MenuItem {
  key: string;
  label: string;
  icon: LucideIconData;
  route?: string;
  permission?: string;
  children?: MenuItem[];
}

export const NAVIGATION_ITEMS: MenuItem[] = [
  { key: 'dashboard', label: 'NAV.dashboard', icon: LayoutDashboard, route: '/dashboard', permission: 'dashboard.view' },
  { key: 'pos', label: 'NAV.pos', icon: ShoppingCart, route: '/pos', permission: 'sales.create' },
  { key: 'notifications', label: 'NAV.notifications', icon: Bell, route: '/notifications', permission: 'notifications.view' },
  { key: 'products', label: 'NAV.products', icon: Pill, route: '/products', permission: 'products.view' },
  { key: 'categories', label: 'NAV.categories', icon: FolderTree, route: '/categories', permission: 'categories.view' },
  { key: 'manufacturers', label: 'NAV.manufacturers', icon: Factory, route: '/manufacturers', permission: 'manufacturers.view' },
  { key: 'inventory', label: 'NAV.inventory', icon: Boxes, route: '/inventory', permission: 'inventory.view', children: [
    { key: 'stock-levels', label: 'NAV.stock_levels', icon: Layers, route: '/inventory', permission: 'inventory.view' },
    { key: 'movements', label: 'NAV.movements', icon: Truck, route: '/inventory/movements', permission: 'inventory.view' },
    { key: 'adjustments', label: 'NAV.adjustments', icon: SlidersHorizontal, route: '/inventory/adjustments', permission: 'inventory.adjust' },
    { key: 'expiry', label: 'NAV.expiry', icon: CalendarX, route: '/inventory/expiry', permission: 'inventory.view' },
  ] },
  { key: 'batches', label: 'NAV.batches', icon: Layers2, route: '/batches', permission: 'batches.view' },
  { key: 'sales', label: 'NAV.sales', icon: Receipt, route: '/sales', permission: 'sales.view' },
  { key: 'sales-returns', label: 'NAV.sales_returns', icon: Undo2, route: '/sales-returns', permission: 'sales.return' },
  { key: 'purchases', label: 'NAV.purchases', icon: PackagePlus, route: '/purchase-orders', permission: 'purchases.view', children: [
    { key: 'purchase-orders', label: 'NAV.purchase_orders', icon: FileText, route: '/purchase-orders', permission: 'purchases.view' },
    { key: 'purchase-receipts', label: 'NAV.purchase_receipts', icon: PackageCheck, route: '/purchase-receipts', permission: 'purchases.view' },
    { key: 'purchase-returns', label: 'NAV.purchase_returns', icon: PackageX, route: '/purchase-returns', permission: 'purchases.return' },
  ] },
  { key: 'suppliers', label: 'NAV.suppliers', icon: Truck, route: '/suppliers', permission: 'suppliers.view' },
  { key: 'customers', label: 'NAV.customers', icon: Users, route: '/customers', permission: 'customers.view' },
  { key: 'prescriptions', label: 'NAV.prescriptions', icon: ClipboardPlus, route: '/prescriptions', permission: 'prescriptions.view' },
  { key: 'expenses', label: 'NAV.expenses', icon: Banknote, route: '/expenses', permission: 'expenses.view' },
  { key: 'payments', label: 'NAV.payments', icon: CreditCard, route: '/payments', permission: 'payments.view' },
  { key: 'cash-register', label: 'NAV.cash_register', icon: Vault, route: '/cash-register', permission: 'cash_register.view' },
  { key: 'reports', label: 'NAV.reports', icon: ChartBar, route: '/reports', permission: 'reports.view' },
  { key: 'users', label: 'NAV.users', icon: UserCog, route: '/users', permission: 'users.view' },
  { key: 'roles', label: 'NAV.roles', icon: Shield, route: '/roles', permission: 'roles.view' },
  { key: 'employees', label: 'NAV.employees', icon: UserRound, route: '/employees', permission: 'employees.view' },
  { key: 'audit-log', label: 'NAV.audit_log', icon: ScrollText, route: '/audit-log', permission: 'audit.view' },
  { key: 'settings', label: 'NAV.settings', icon: Settings, route: '/settings', permission: 'settings.view' },
];

export const EMPTY_USER: AuthUser = {
  id: '',
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  roles: [],
  permissions: [],
};