import { Module, type ValidationPipeOptions } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CashRegisterModule } from './modules/cash-register/cash-register.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ExpenseCategoriesModule } from './modules/expense-categories/expense-categories.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ManufacturersModule } from './modules/manufacturers/manufacturers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { PurchaseReceiptsModule } from './modules/purchase-receipts/purchase-receipts.module';
import { PurchaseReturnsModule } from './modules/purchase-returns/purchase-returns.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SearchModule } from './modules/search/search.module';
import { PosModule } from './modules/pos/pos.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { RolesModule } from './modules/roles/roles.module';
import { SalesModule } from './modules/sales/sales.module';
import { SalesReturnsModule } from './modules/sales-returns/sales-returns.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  forbidNonWhitelisted: true,
};

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    PrismaModule,
    AuditModule,
    SettingsModule,
    RolesModule,
    UsersModule,
    CashRegisterModule,
    ExpensesModule,
    HealthModule,
    ExpenseCategoriesModule,
    PaymentsModule,
    DashboardModule,
    ReportsModule,
    SearchModule,
    NotificationsModule,
    DocumentsModule,
    CategoriesModule,
    ManufacturersModule,
    BatchesModule,
    InventoryModule,
    PurchaseOrdersModule,
    PurchaseReceiptsModule,
    PurchaseReturnsModule,
PosModule,
PrescriptionsModule,
SalesModule,
    SalesReturnsModule,
    SuppliersModule,
    CustomersModule,
    EmployeesModule,
    ProductsModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}