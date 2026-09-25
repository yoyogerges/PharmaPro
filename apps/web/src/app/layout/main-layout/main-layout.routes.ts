import type { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth.guard';
import { permissionGuard } from '@core/auth/permission.guard';

export const mainLayoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./main-layout.component').then((m) => m.MainLayoutComponent),
    canMatch: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'change-password',
        loadComponent: () => import('@features/change-password/change-password.component').then((m) => m.ChangePasswordComponent),
      },
      {
        path: 'search',
        canActivate: [permissionGuard('search.global')],
        loadComponent: () => import('@features/search/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard('users.view')],
        loadComponent: () => import('@features/users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'users/register',
        canActivate: [permissionGuard('users.create')],
        loadComponent: () => import('@features/users/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard('roles.view')],
        loadComponent: () => import('@features/roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard('settings.view')],
        loadComponent: () => import('@features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'dashboard',
        canActivate: [permissionGuard('dashboard.view')],
        loadComponent: () => import('@features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () => import('@features/reports/reports-index.component').then((m) => m.ReportsIndexComponent),
      },
      {
        path: 'reports/:type',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () => import('@features/reports/reports-viewer.component').then((m) => m.ReportsViewerComponent),
      },
      {
        path: 'products',
        canActivate: [permissionGuard('products.view')],
        loadComponent: () => import('@features/products/products-list.component').then((m) => m.ProductsListComponent),
      },
      {
        path: 'products/new',
        canActivate: [permissionGuard('products.create')],
        loadComponent: () => import('@features/products/products-form.component').then((m) => m.ProductsFormComponent),
      },
      {
        path: 'products/:id/edit',
        canActivate: [permissionGuard('products.update')],
        loadComponent: () => import('@features/products/products-form.component').then((m) => m.ProductsFormComponent),
      },
      {
        path: 'categories',
        canActivate: [permissionGuard('categories.view')],
        loadComponent: () => import('@features/categories/categories.component').then((m) => m.CategoriesComponent),
      },
      {
        path: 'manufacturers',
        canActivate: [permissionGuard('manufacturers.view')],
        loadComponent: () => import('@features/manufacturers/manufacturers.component').then((m) => m.ManufacturersComponent),
      },
      {
        path: 'suppliers',
        canActivate: [permissionGuard('suppliers.view')],
        loadComponent: () => import('@features/suppliers/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'customers',
        canActivate: [permissionGuard('customers.view')],
        loadComponent: () => import('@features/customers/customers.component').then((m) => m.CustomersComponent),
      },
      {
        path: 'employees',
        canActivate: [permissionGuard('employees.view')],
        loadComponent: () => import('@features/employees/employees.component').then((m) => m.EmployeesComponent),
      },
      {
        path: 'inventory',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () => import('@features/inventory/stock-levels.component').then((m) => m.StockLevelsComponent),
      },
      {
        path: 'inventory/movements',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () => import('@features/inventory/movements.component').then((m) => m.MovementsComponent),
      },
      {
        path: 'inventory/adjustments',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () => import('@features/inventory/adjustments.component').then((m) => m.AdjustmentsComponent),
      },
      {
        path: 'inventory/expiry',
        canActivate: [permissionGuard('inventory.view')],
        loadComponent: () => import('@features/inventory/expiry.component').then((m) => m.ExpiryComponent),
      },
      {
        path: 'batches',
        canActivate: [permissionGuard('batches.view')],
        loadComponent: () => import('@features/batches/batches.component').then((m) => m.BatchesComponent),
      },
      {
        path: 'batches/:id',
        canActivate: [permissionGuard('batches.view')],
        loadComponent: () => import('@features/batches/batch-detail.component').then((m) => m.BatchDetailComponent),
      },
      {
        path: 'purchase-orders',
        canActivate: [permissionGuard('purchases.view')],
        loadComponent: () => import('@features/purchases/purchase-orders.component').then((m) => m.PurchaseOrdersComponent),
      },
      {
        path: 'purchase-orders/new',
        canActivate: [permissionGuard('purchases.create')],
        loadComponent: () => import('@features/purchases/purchase-order-form.component').then((m) => m.PurchaseOrderFormComponent),
      },
      {
        path: 'purchase-orders/:id/edit',
        canActivate: [permissionGuard('purchases.create')],
        loadComponent: () => import('@features/purchases/purchase-order-form.component').then((m) => m.PurchaseOrderFormComponent),
      },
      {
        path: 'purchase-orders/:id/receive',
        canActivate: [permissionGuard('purchases.receive')],
        loadComponent: () => import('@features/purchases/purchase-receive.component').then((m) => m.PurchaseReceiveComponent),
      },
      {
        path: 'purchase-orders/:id',
        canActivate: [permissionGuard('purchases.view')],
        loadComponent: () => import('@features/purchases/purchase-order-detail.component').then((m) => m.PurchaseOrderDetailComponent),
      },
      {
        path: 'purchase-receipts',
        canActivate: [permissionGuard('purchases.view')],
        loadComponent: () => import('@features/purchases/purchase-receipts.component').then((m) => m.PurchaseReceiptsComponent),
      },
      {
        path: 'purchase-returns',
        canActivate: [permissionGuard('purchases.return')],
        loadComponent: () => import('@features/purchases/purchase-returns.component').then((m) => m.PurchaseReturnsComponent),
      },
      {
        path: 'sales-returns/new/:saleId',
        canActivate: [permissionGuard('sales.return')],
        loadComponent: () => import('@features/sales-returns/return-create.component').then((m) => m.ReturnCreateComponent),
      },
      {
        path: 'sales-returns/new',
        canActivate: [permissionGuard('sales.return')],
        loadComponent: () => import('@features/sales-returns/return-create.component').then((m) => m.ReturnCreateComponent),
      },
      {
        path: 'sales-returns',
        canActivate: [permissionGuard('sales.view')],
        loadComponent: () => import('@features/sales-returns/sales-returns.component').then((m) => m.SalesReturnsComponent),
      },
      {
        path: 'sales/:id/receipt',
        canActivate: [permissionGuard('sales.view')],
        loadComponent: () => import('@features/sales/receipt-view.component').then((m) => m.ReceiptViewComponent),
      },
      {
        path: 'sales/:id',
        canActivate: [permissionGuard('sales.view')],
        loadComponent: () => import('@features/sales/sale-detail.component').then((m) => m.SaleDetailComponent),
      },
      {
        path: 'sales',
        canActivate: [permissionGuard('sales.view')],
        loadComponent: () => import('@features/sales/sales-list.component').then((m) => m.SalesListComponent),
      },
      {
        path: 'prescriptions/new',
        canActivate: [permissionGuard('prescriptions.create')],
        loadComponent: () => import('@features/prescriptions/prescription-form.component').then((m) => m.PrescriptionFormComponent),
      },
      {
        path: 'prescriptions/:id',
        canActivate: [permissionGuard('prescriptions.view')],
        loadComponent: () => import('@features/prescriptions/prescription-detail.component').then((m) => m.PrescriptionDetailComponent),
      },
      {
        path: 'prescriptions',
        canActivate: [permissionGuard('prescriptions.view')],
        loadComponent: () => import('@features/prescriptions/prescriptions-list.component').then((m) => m.PrescriptionsListComponent),
      },
      {
        path: 'expense-categories',
        canActivate: [permissionGuard('expenses.view')],
        loadComponent: () => import('@features/expenses/expense-categories.component').then((m) => m.ExpenseCategoriesComponent),
      },
      {
        path: 'expenses/new',
        canActivate: [permissionGuard('expenses.create')],
        loadComponent: () => import('@features/expenses/expense-form.component').then((m) => m.ExpenseFormComponent),
      },
      {
        path: 'expenses',
        canActivate: [permissionGuard('expenses.view')],
        loadComponent: () => import('@features/expenses/expenses-list.component').then((m) => m.ExpensesListComponent),
      },
      {
        path: 'payments/new',
        canActivate: [permissionGuard('payments.create')],
        loadComponent: () => import('@features/payments/payment-form.component').then((m) => m.PaymentFormComponent),
      },
      {
        path: 'payments',
        canActivate: [permissionGuard('payments.view')],
        loadComponent: () => import('@features/payments/payments-list.component').then((m) => m.PaymentsListComponent),
      },
      {
        path: 'cash-register',
        canActivate: [permissionGuard('cash_register.view')],
        loadComponent: () => import('@features/cash-register/cash-register.component').then((m) => m.CashRegisterComponent),
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard('notifications.view')],
        loadComponent: () => import('@features/notifications/notifications.component').then((m) => m.NotificationsComponent),
      },
      {
        path: 'audit-log',
        canActivate: [permissionGuard('audit.view')],
        loadComponent: () => import('@features/audit-log/audit-log.component').then((m) => m.AuditLogComponent),
      },
    ],
  },
];