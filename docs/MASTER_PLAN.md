# ═══════════════════════════════════════════════════════════════════════════════
# PharmaPro — MASTER IMPLEMENTATION PLAN
# Professional Pharmacy Management System
# ═══════════════════════════════════════════════════════════════════════════════
#
# Document Version: 1.0
# Created: 2026-09-24
# Status: Pending Approval
#
# This document contains the COMPLETE implementation blueprint for PharmaPro
# covering all 14 phases, ~523 files, 38 database models, 100+ API endpoints,
# and 30+ frontend feature pages.
# ═══════════════════════════════════════════════════════════════════════════════

---

# TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Database Design (Complete Schema)](#5-database-design)
6. [Phase 0 — Architecture](#phase-0--architecture)
7. [Phase 1 — Project Foundation](#phase-1--project-foundation)
8. [Phase 2 — Authentication & Authorization](#phase-2--authentication--authorization)
9. [Phase 3 — Core Pharmacy Data](#phase-3--core-pharmacy-data)
10. [Phase 4 — Inventory](#phase-4--inventory)
11. [Phase 5 — Purchases](#phase-5--purchases)
12. [Phase 6 — Sales & POS](#phase-6--sales--pos)
13. [Phase 7 — Prescriptions](#phase-7--prescriptions)
14. [Phase 8 — Finance](#phase-8--finance)
15. [Phase 9 — Dashboard & Reports](#phase-9--dashboard--reports)
16. [Phase 10 — Notifications, Documents & Audit](#phase-10--notifications-documents--audit)
17. [Phase 11 — Settings & i18n](#phase-11--settings--internationalization)
18. [Phase 12 — UI/UX Polish](#phase-12--uiux-polish)
19. [Phase 13 — Testing & Security](#phase-13--testing--security)
20. [Phase 14 — Production Readiness](#phase-14--production-readiness)
21. [Seed Data Specification](#21-seed-data-specification)
22. [Business Rules Reference](#22-business-rules-reference)
23. [API Reference (Complete)](#23-api-reference)
24. [Frontend Routes (Complete)](#24-frontend-routes)
25. [Permission Matrix (Complete)](#25-permission-matrix)
26. [Final Quality Audit Checklist](#26-final-quality-audit)

---

# 1. SYSTEM OVERVIEW

PharmaPro is a complete, production-ready web-based Pharmacy Management System
designed for real pharmacy operations. It is NOT a demo, NOT a SaaS template,
and NOT a student project.

## What It Manages
- Pharmacy information & settings
- Products / Medicines (50+ fields per product)
- Categories (hierarchical)
- Manufacturers
- Inventory (batch-level with FEFO)
- Expiry date management
- Barcode management
- Point of Sale (POS)
- Sales & invoices
- Sales returns
- Customers / Patients
- Prescriptions & dispensing
- Suppliers
- Purchase Orders (with approval workflow)
- Purchase receiving
- Purchase returns
- Employees
- Users, Roles & Permissions (RBAC)
- Expenses & expense categories
- Payments (customer, supplier, expense)
- Cash register & sessions
- Dashboard with real-time KPIs
- 20 configurable reports
- Notifications center
- Document management
- Audit logging
- Arabic & English with RTL/LTR
- Responsive design (desktop, tablet, mobile)

---

# 2. TECHNOLOGY STACK

## Frontend
```
Framework:        Angular 19+ (Standalone Components, Signals, @if/@for control flow)
Language:         TypeScript 5.5+
Styling:          Tailwind CSS v4 (CSS-first, @theme, @import "tailwindcss")
Icons:            Lucide Angular
Charts:           ApexCharts (ng-apexcharts)
i18n:             @ngx-translate/core v18+ (provideTranslateService)
HTTP:             Angular HttpClient with functional interceptors
State:            Angular Signals (signal, computed, effect)
Forms:            Reactive Forms (NonNullableFormBuilder, typed)
Routing:          Angular Router (lazy loading, functional guards)
Dialogs:          @angular/cdk/dialog
Overlays:         @angular/cdk/overlay
```

## Backend
```
Framework:        NestJS v11 (LTS)
Language:         TypeScript 5.5+
ORM:              Prisma v6
Database:         PostgreSQL 16
Cache:            Redis 7
Auth:             JWT (access 15min + refresh 7 days) + Passport
Hashing:          Argon2 (argon2id, 64MB memory, 3 iterations)
Validation:       class-validator + class-transformer
API Docs:         @nestjs/swagger (OpenAPI 3.1)
Rate Limiting:    @nestjs/throttler
Security:         helmet, CORS, cookie-parser
Logging:          NestJS Logger (structured)
File Upload:      multer
```

## Infrastructure
```
Containers:       Docker + Docker Compose
Database:         PostgreSQL 16 Alpine
Cache:            Redis 7 Alpine
Web Server:       Nginx (production frontend)
Runtime:          Node.js 22 LTS
Package Manager:  npm 10.x with workspaces
Version Control:  Git
Testing:          Jest (backend), Playwright (E2E)
```

---

# 3. SYSTEM ARCHITECTURE

```
                    ┌─────────────────────────────────┐
                    │          Web Browsers            │
                    │   Desktop / Tablet / Mobile      │
                    └─────────────┬───────────────────┘
                                  │ HTTPS
                    ┌─────────────▼───────────────────┐
                    │     Angular SPA (Port 4200)      │
                    │                                  │
                    │  ┌───────────────────────────┐   │
                    │  │ App Shell                 │   │
                    │  │  ├─ Auth Layout           │   │
                    │  │  ├─ Main Layout           │   │
                    │  │  │   ├─ Sidebar           │   │
                    │  │  │   ├─ Topbar            │   │
                    │  │  │   └─ Content           │   │
                    │  │  └─ POS Layout            │   │
                    │  ├───────────────────────────┤   │
                    │  │ Core Services             │   │
                    │  │  ├─ AuthService (signals)  │   │
                    │  │  ├─ ApiService (HTTP)      │   │
                    │  │  ├─ ThemeService (RTL)     │   │
                    │  │  └─ NotificationService    │   │
                    │  ├───────────────────────────┤   │
                    │  │ HTTP Interceptors          │   │
                    │  │  ├─ authInterceptor        │   │
                    │  │  └─ errorInterceptor       │   │
                    │  ├───────────────────────────┤   │
                    │  │ Route Guards               │   │
                    │  │  ├─ authGuard              │   │
                    │  │  └─ permissionGuard        │   │
                    │  └───────────────────────────┘   │
                    └─────────────┬───────────────────┘
                                  │ REST API (JSON)
                                  │ Authorization: Bearer <JWT>
                    ┌─────────────▼───────────────────┐
                    │    NestJS API (Port 3000)        │
                    │    Prefix: /api/v1               │
                    │                                  │
                    │  ┌───────────────────────────┐   │
                    │  │ Global Middleware          │   │
                    │  │  ├─ Helmet (security)      │   │
                    │  │  ├─ CORS                   │   │
                    │  │  ├─ ValidationPipe          │   │
                    │  │  ├─ ThrottlerGuard          │   │
                    │  │  ├─ JwtAuthGuard (global)   │   │
                    │  │  ├─ RolesGuard             │   │
                    │  │  ├─ PermissionsGuard       │   │
                    │  │  ├─ TransformInterceptor   │   │
                    │  │  ├─ LoggingInterceptor     │   │
                    │  │  └─ HttpExceptionFilter    │   │
                    │  ├───────────────────────────┤   │
                    │  │ Feature Modules            │   │
                    │  │  ├─ AuthModule             │   │
                    │  │  ├─ UsersModule            │   │
                    │  │  ├─ RolesModule            │   │
                    │  │  ├─ ProductsModule         │   │
                    │  │  ├─ CategoriesModule       │   │
                    │  │  ├─ ManufacturersModule    │   │
                    │  │  ├─ SuppliersModule        │   │
                    │  │  ├─ CustomersModule        │   │
                    │  │  ├─ EmployeesModule        │   │
                    │  │  ├─ InventoryModule        │   │
                    │  │  ├─ BatchesModule          │   │
                    │  │  ├─ PosModule              │   │
                    │  │  ├─ SalesModule            │   │
                    │  │  ├─ SalesReturnsModule     │   │
                    │  │  ├─ PrescriptionsModule    │   │
                    │  │  ├─ PurchaseOrdersModule   │   │
                    │  │  ├─ PurchaseReceiptsModule │   │
                    │  │  ├─ PurchaseReturnsModule  │   │
                    │  │  ├─ CashRegisterModule     │   │
                    │  │  ├─ ExpensesModule         │   │
                    │  │  ├─ PaymentsModule         │   │
                    │  │  ├─ DashboardModule        │   │
                    │  │  ├─ ReportsModule          │   │
                    │  │  ├─ NotificationsModule    │   │
                    │  │  ├─ DocumentsModule        │   │
                    │  │  ├─ AuditLogModule         │   │
                    │  │  ├─ SettingsModule         │   │
                    │  │  └─ SearchModule           │   │
                    │  ├───────────────────────────┤   │
                    │  │ PrismaService (Global)     │   │
                    │  └───────────────────────────┘   │
                    └──────┬──────────────┬───────────┘
                           │              │
              ┌────────────▼──────┐ ┌─────▼─────────┐
              │  PostgreSQL 16    │ │   Redis 7      │
              │  Port: 5432       │ │   Port: 6379   │
              │                   │ │                │
              │  38 Tables        │ │  - Refresh     │
              │  18 Enums         │ │    tokens      │
              │  Indexes          │ │  - Rate limit  │
              │  Constraints      │ │    counters    │
              │  Transactions     │ │  - Cache       │
              └───────────────────┘ └────────────────┘
```

---

# 4. PROJECT DIRECTORY STRUCTURE

```
d:\PharmaPro\
│
├── package.json                              # Root workspace
├── .gitignore                                # Git ignore rules
├── .env.example                              # Environment template
├── .env                                      # Development environment (git-ignored)
├── docker-compose.yml                        # Development: PostgreSQL + Redis
├── docker-compose.prod.yml                   # Production: All services
├── README.md                                 # Complete documentation
│
├── prisma/
│   ├── schema.prisma                         # Complete database schema (38 models)
│   ├── migrations/                           # Auto-generated migrations
│   └── seed/
│       ├── index.ts                          # Seed runner
│       ├── data/
│       │   ├── roles-permissions.ts          # 8 roles, 50+ permissions
│       │   ├── users.ts                      # 8 demo users
│       │   ├── pharmacy.ts                   # Pharmacy info
│       │   ├── categories.ts                 # 12 categories
│       │   ├── manufacturers.ts              # 8 manufacturers
│       │   ├── products.ts                   # 50 products
│       │   ├── suppliers.ts                  # 10 suppliers
│       │   ├── customers.ts                  # 20 customers
│       │   ├── employees.ts                  # 15 employees
│       │   ├── batches.ts                    # 100+ batches
│       │   ├── purchases.ts                  # 15 POs + receipts
│       │   ├── sales.ts                      # 50 sales
│       │   ├── prescriptions.ts              # 10 prescriptions
│       │   ├── expenses.ts                   # 20 expenses
│       │   ├── payments.ts                   # 30 payments
│       │   ├── cash-sessions.ts              # 5 sessions
│       │   └── notifications.ts              # 15 notifications
│       └── helpers/
│           ├── hash.ts                       # Password hashing utility
│           └── generators.ts                 # Invoice/PO number generators
│
├── libs/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                      # Barrel exports
│           ├── types/
│           │   ├── api-response.ts           # ApiResponse<T>, PaginatedResponse<T>
│           │   ├── pagination.ts             # PaginationMeta, PaginationQuery
│           │   ├── enums.ts                  # All TypeScript enums
│           │   ├── user.types.ts             # User, Role, Permission types
│           │   ├── product.types.ts          # Product, Category, Manufacturer
│           │   ├── inventory.types.ts        # Batch, Movement, Adjustment
│           │   ├── sales.types.ts            # Sale, SaleItem, SalePayment
│           │   ├── purchase.types.ts         # PO, Receipt, Return
│           │   ├── finance.types.ts          # Expense, Payment, CashSession
│           │   ├── prescription.types.ts     # Prescription, PrescriptionItem
│           │   └── index.ts
│           └── constants/
│               ├── permissions.ts            # Permission constants
│               ├── roles.ts                  # Default role names
│               └── index.ts
│
├── apps/
│   ├── api/                                  # ══════ NestJS Backend ══════
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── nest-cli.json                     # Swagger plugin enabled
│   │   ├── jest.config.ts                    # Test configuration
│   │   │
│   │   ├── src/
│   │   │   ├── main.ts                       # Bootstrap: helmet, CORS, validation, swagger
│   │   │   ├── app.module.ts                 # Root module
│   │   │   │
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts          # @Global() Prisma module
│   │   │   │   └── prisma.service.ts         # PrismaClient lifecycle
│   │   │   │
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts    # Global exception handler
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── transform.interceptor.ts    # { success, data, meta } wrapper
│   │   │   │   │   └── logging.interceptor.ts      # Request duration logging
│   │   │   │   ├── guards/
│   │   │   │   │   ├── jwt-auth.guard.ts           # JWT + @Public() bypass
│   │   │   │   │   ├── roles.guard.ts              # @Roles() enforcement
│   │   │   │   │   └── permissions.guard.ts        # @RequirePermissions() enforcement
│   │   │   │   ├── decorators/
│   │   │   │   │   ├── public.decorator.ts         # @Public() - skip auth
│   │   │   │   │   ├── current-user.decorator.ts   # @CurrentUser() param
│   │   │   │   │   ├── roles.decorator.ts          # @Roles('admin')
│   │   │   │   │   └── permissions.decorator.ts    # @RequirePermissions('products.create')
│   │   │   │   ├── dto/
│   │   │   │   │   └── pagination-query.dto.ts     # page, limit, sortBy, sortOrder, search
│   │   │   │   ├── pipes/
│   │   │   │   │   └── parse-uuid.pipe.ts          # UUID validation pipe
│   │   │   │   └── services/
│   │   │   │       └── audit.service.ts            # Shared audit logging service
│   │   │   │
│   │   │   └── modules/
│   │   │       ├── health/
│   │   │       │   ├── health.module.ts
│   │   │       │   └── health.controller.ts        # GET /health
│   │   │       │
│   │   │       ├── auth/                           # ── Phase 2 ──
│   │   │       │   ├── auth.module.ts
│   │   │       │   ├── auth.controller.ts          # login, logout, refresh, change-password, me
│   │   │       │   ├── auth.service.ts             # Token generation, validation, rotation
│   │   │       │   ├── strategies/
│   │   │       │   │   ├── jwt.strategy.ts         # Access token strategy
│   │   │       │   │   └── jwt-refresh.strategy.ts # Refresh token strategy
│   │   │       │   └── dto/
│   │   │       │       ├── login.dto.ts
│   │   │       │       ├── change-password.dto.ts
│   │   │       │       └── refresh-token.dto.ts
│   │   │       │
│   │   │       ├── users/                          # ── Phase 2 ──
│   │   │       │   ├── users.module.ts
│   │   │       │   ├── users.controller.ts
│   │   │       │   ├── users.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-user.dto.ts
│   │   │       │       ├── update-user.dto.ts
│   │   │       │       └── user-query.dto.ts
│   │   │       │
│   │   │       ├── roles/                          # ── Phase 2 ──
│   │   │       │   ├── roles.module.ts
│   │   │       │   ├── roles.controller.ts
│   │   │       │   ├── roles.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-role.dto.ts
│   │   │       │       ├── update-role.dto.ts
│   │   │       │       └── assign-permissions.dto.ts
│   │   │       │
│   │   │       ├── permissions/                    # ── Phase 2 ──
│   │   │       │   ├── permissions.module.ts
│   │   │       │   ├── permissions.controller.ts
│   │   │       │   └── permissions.service.ts
│   │   │       │
│   │   │       ├── products/                       # ── Phase 3 ──
│   │   │       │   ├── products.module.ts
│   │   │       │   ├── products.controller.ts
│   │   │       │   ├── products.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-product.dto.ts
│   │   │       │       ├── update-product.dto.ts
│   │   │       │       └── product-query.dto.ts
│   │   │       │
│   │   │       ├── categories/                     # ── Phase 3 ──
│   │   │       │   ├── categories.module.ts
│   │   │       │   ├── categories.controller.ts
│   │   │       │   ├── categories.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-category.dto.ts
│   │   │       │       └── update-category.dto.ts
│   │   │       │
│   │   │       ├── manufacturers/                  # ── Phase 3 ──
│   │   │       │   ├── manufacturers.module.ts
│   │   │       │   ├── manufacturers.controller.ts
│   │   │       │   ├── manufacturers.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-manufacturer.dto.ts
│   │   │       │       └── update-manufacturer.dto.ts
│   │   │       │
│   │   │       ├── suppliers/                      # ── Phase 3 ──
│   │   │       │   ├── suppliers.module.ts
│   │   │       │   ├── suppliers.controller.ts
│   │   │       │   ├── suppliers.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-supplier.dto.ts
│   │   │       │       ├── update-supplier.dto.ts
│   │   │       │       └── supplier-query.dto.ts
│   │   │       │
│   │   │       ├── customers/                      # ── Phase 3 ──
│   │   │       │   ├── customers.module.ts
│   │   │       │   ├── customers.controller.ts
│   │   │       │   ├── customers.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-customer.dto.ts
│   │   │       │       ├── update-customer.dto.ts
│   │   │       │       └── customer-query.dto.ts
│   │   │       │
│   │   │       ├── employees/                      # ── Phase 3 ──
│   │   │       │   ├── employees.module.ts
│   │   │       │   ├── employees.controller.ts
│   │   │       │   ├── employees.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-employee.dto.ts
│   │   │       │       └── update-employee.dto.ts
│   │   │       │
│   │   │       ├── inventory/                      # ── Phase 4 ──
│   │   │       │   ├── inventory.module.ts
│   │   │       │   ├── inventory.controller.ts
│   │   │       │   ├── inventory.service.ts        # FEFO algorithm, stock management
│   │   │       │   └── dto/
│   │   │       │       ├── stock-adjustment.dto.ts
│   │   │       │       ├── inventory-query.dto.ts
│   │   │       │       └── approve-adjustment.dto.ts
│   │   │       │
│   │   │       ├── batches/                        # ── Phase 4 ──
│   │   │       │   ├── batches.module.ts
│   │   │       │   ├── batches.controller.ts
│   │   │       │   ├── batches.service.ts
│   │   │       │   └── dto/
│   │   │       │       └── batch-query.dto.ts
│   │   │       │
│   │   │       ├── purchase-orders/                # ── Phase 5 ──
│   │   │       │   ├── purchase-orders.module.ts
│   │   │       │   ├── purchase-orders.controller.ts
│   │   │       │   ├── purchase-orders.service.ts  # Status machine, approval
│   │   │       │   └── dto/
│   │   │       │       ├── create-po.dto.ts
│   │   │       │       ├── update-po.dto.ts
│   │   │       │       └── po-query.dto.ts
│   │   │       │
│   │   │       ├── purchase-receipts/              # ── Phase 5 ──
│   │   │       │   ├── purchase-receipts.module.ts
│   │   │       │   ├── purchase-receipts.controller.ts
│   │   │       │   ├── purchase-receipts.service.ts # Batch creation, stock update
│   │   │       │   └── dto/
│   │   │       │       └── create-receipt.dto.ts
│   │   │       │
│   │   │       ├── purchase-returns/               # ── Phase 5 ──
│   │   │       │   ├── purchase-returns.module.ts
│   │   │       │   ├── purchase-returns.controller.ts
│   │   │       │   ├── purchase-returns.service.ts
│   │   │       │   └── dto/
│   │   │       │       └── create-purchase-return.dto.ts
│   │   │       │
│   │   │       ├── pos/                            # ── Phase 6 ──
│   │   │       │   ├── pos.module.ts
│   │   │       │   ├── pos.controller.ts
│   │   │       │   └── pos.service.ts              # Sale creation (transactional)
│   │   │       │
│   │   │       ├── sales/                          # ── Phase 6 ──
│   │   │       │   ├── sales.module.ts
│   │   │       │   ├── sales.controller.ts
│   │   │       │   ├── sales.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-sale.dto.ts
│   │   │       │       └── sale-query.dto.ts
│   │   │       │
│   │   │       ├── sales-returns/                  # ── Phase 6 ──
│   │   │       │   ├── sales-returns.module.ts
│   │   │       │   ├── sales-returns.controller.ts
│   │   │       │   ├── sales-returns.service.ts
│   │   │       │   └── dto/
│   │   │       │       └── create-sales-return.dto.ts
│   │   │       │
│   │   │       ├── prescriptions/                  # ── Phase 7 ──
│   │   │       │   ├── prescriptions.module.ts
│   │   │       │   ├── prescriptions.controller.ts
│   │   │       │   ├── prescriptions.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-prescription.dto.ts
│   │   │       │       ├── update-prescription.dto.ts
│   │   │       │       └── dispense.dto.ts
│   │   │       │
│   │   │       ├── expenses/                       # ── Phase 8 ──
│   │   │       │   ├── expenses.module.ts
│   │   │       │   ├── expenses.controller.ts
│   │   │       │   ├── expenses.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-expense.dto.ts
│   │   │       │       └── expense-query.dto.ts
│   │   │       │
│   │   │       ├── expense-categories/             # ── Phase 8 ──
│   │   │       │   ├── expense-categories.module.ts
│   │   │       │   ├── expense-categories.controller.ts
│   │   │       │   ├── expense-categories.service.ts
│   │   │       │   └── dto/
│   │   │       │       └── create-expense-category.dto.ts
│   │   │       │
│   │   │       ├── payments/                       # ── Phase 8 ──
│   │   │       │   ├── payments.module.ts
│   │   │       │   ├── payments.controller.ts
│   │   │       │   ├── payments.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── create-payment.dto.ts
│   │   │       │       └── payment-query.dto.ts
│   │   │       │
│   │   │       ├── cash-register/                  # ── Phase 8 ──
│   │   │       │   ├── cash-register.module.ts
│   │   │       │   ├── cash-register.controller.ts
│   │   │       │   ├── cash-register.service.ts
│   │   │       │   └── dto/
│   │   │       │       ├── open-session.dto.ts
│   │   │       │       └── close-session.dto.ts
│   │   │       │
│   │   │       ├── dashboard/                      # ── Phase 9 ──
│   │   │       │   ├── dashboard.module.ts
│   │   │       │   ├── dashboard.controller.ts
│   │   │       │   └── dashboard.service.ts        # Aggregation queries
│   │   │       │
│   │   │       ├── reports/                        # ── Phase 9 ──
│   │   │       │   ├── reports.module.ts
│   │   │       │   ├── reports.controller.ts
│   │   │       │   ├── reports.service.ts          # 20 report types
│   │   │       │   └── dto/
│   │   │       │       └── report-query.dto.ts
│   │   │       │
│   │   │       ├── notifications/                  # ── Phase 10 ──
│   │   │       │   ├── notifications.module.ts
│   │   │       │   ├── notifications.controller.ts
│   │   │       │   ├── notifications.service.ts
│   │   │       │   └── notifications.gateway.ts    # Optional WebSocket
│   │   │       │
│   │   │       ├── documents/                      # ── Phase 10 ──
│   │   │       │   ├── documents.module.ts
│   │   │       │   ├── documents.controller.ts
│   │   │       │   └── documents.service.ts
│   │   │       │
│   │   │       ├── audit-log/                      # ── Phase 10 ──
│   │   │       │   ├── audit-log.module.ts
│   │   │       │   ├── audit-log.controller.ts
│   │   │       │   └── audit-log.service.ts
│   │   │       │
│   │   │       ├── settings/                       # ── Phase 11 ──
│   │   │       │   ├── settings.module.ts
│   │   │       │   ├── settings.controller.ts
│   │   │       │   ├── settings.service.ts
│   │   │       │   └── dto/
│   │   │       │       └── update-settings.dto.ts
│   │   │       │
│   │   │       └── search/                         # ── Phase 11 ──
│   │   │           ├── search.module.ts
│   │   │           ├── search.controller.ts
│   │   │           └── search.service.ts           # Global search across entities
│   │   │
│   │   └── test/
│   │       ├── auth.e2e-spec.ts                    # ── Phase 13 ──
│   │       ├── sale-flow.e2e-spec.ts
│   │       ├── purchase-flow.e2e-spec.ts
│   │       └── jest-e2e.config.ts
│   │
│   └── web/                                  # ══════ Angular Frontend ══════
│       ├── package.json
│       ├── angular.json
│       ├── tsconfig.json                     # Path aliases: @core/*, @shared/*, @features/*
│       ├── tsconfig.app.json
│       ├── .postcssrc.json                   # @tailwindcss/postcss
│       │
│       └── src/
│           ├── main.ts                       # bootstrapApplication
│           ├── index.html                    # <html dir="ltr" lang="en">
│           ├── styles.css                    # @import "tailwindcss"; @theme {...}
│           │
│           ├── environments/
│           │   ├── environment.ts            # { apiUrl: 'http://localhost:3000/api/v1' }
│           │   └── environment.prod.ts       # { apiUrl: '/api/v1' }
│           │
│           ├── assets/
│           │   ├── i18n/
│           │   │   ├── en.json               # ~500 English translation keys
│           │   │   └── ar.json               # ~500 Arabic translation keys
│           │   └── images/
│           │       ├── logo.svg              # PharmaPro logo
│           │       ├── empty-state.svg       # Illustration for empty states
│           │       └── login-bg.svg          # Login page background
│           │
│           └── app/
│               ├── app.component.ts          # Root: <router-outlet>
│               ├── app.config.ts             # providers: router, http, i18n, interceptors
│               ├── app.routes.ts             # Top-level routes
│               │
│               ├── core/                     # ── Singleton Services ──
│               │   ├── auth/
│               │   │   ├── auth.service.ts           # Signal-based: user, isLoggedIn, permissions
│               │   │   ├── auth.guard.ts             # CanActivateFn: check isLoggedIn
│               │   │   ├── permission.guard.ts       # CanActivateFn: check permissions
│               │   │   ├── auth.interceptor.ts       # HttpInterceptorFn: Bearer token + 401 refresh
│               │   │   ├── error.interceptor.ts      # HttpInterceptorFn: error handling
│               │   │   └── token.service.ts          # localStorage: get/set/clear tokens
│               │   ├── services/
│               │   │   ├── api.service.ts            # Base HTTP: get, post, patch, delete, paginated
│               │   │   ├── notification.service.ts   # Toast: success, error, warning, info (signals)
│               │   │   └── theme.service.ts          # Language switch, RTL/LTR, dark mode
│               │   └── models/
│               │       └── menu.model.ts             # Sidebar menu item type
│               │
│               ├── shared/                   # ── Reusable Components ──
│               │   ├── components/
│               │   │   ├── data-table/               # Sortable table + pagination + actions
│               │   │   │   ├── data-table.component.ts
│               │   │   │   └── data-table.component.html
│               │   │   ├── page-header/              # Title + breadcrumb + action buttons
│               │   │   │   ├── page-header.component.ts
│               │   │   │   └── page-header.component.html
│               │   │   ├── confirm-dialog/           # CDK Dialog confirmation
│               │   │   │   └── confirm-dialog.component.ts
│               │   │   ├── search-input/             # Debounced search
│               │   │   │   └── search-input.component.ts
│               │   │   ├── status-badge/             # Colored status pill
│               │   │   │   └── status-badge.component.ts
│               │   │   ├── stat-card/                # KPI metric card
│               │   │   │   └── stat-card.component.ts
│               │   │   ├── form-field/               # Label + input + error wrapper
│               │   │   │   └── form-field.component.ts
│               │   │   ├── select-search/            # Searchable dropdown
│               │   │   │   └── select-search.component.ts
│               │   │   ├── date-range-picker/        # From-to date selector
│               │   │   │   └── date-range-picker.component.ts
│               │   │   ├── loading-spinner/          # Spinner / skeleton
│               │   │   │   └── loading-spinner.component.ts
│               │   │   ├── empty-state/              # Illustrated "no data" message
│               │   │   │   └── empty-state.component.ts
│               │   │   ├── toast-container/          # Toast notification display
│               │   │   │   └── toast-container.component.ts
│               │   │   ├── file-upload/              # Drag & drop file upload
│               │   │   │   └── file-upload.component.ts
│               │   │   └── language-switcher/        # EN/AR toggle
│               │   │       └── language-switcher.component.ts
│               │   │
│               │   ├── directives/
│               │   │   ├── permission.directive.ts   # *appHasPermission="'products.create'"
│               │   │   └── click-outside.directive.ts # Close dropdowns on outside click
│               │   │
│               │   └── pipes/
│               │       ├── pharmacy-currency.pipe.ts  # Format with pharmacy currency
│               │       ├── date-format.pipe.ts        # Format dates per locale
│               │       └── truncate.pipe.ts           # Truncate long text
│               │
│               ├── layout/                   # ── App Layouts ──
│               │   ├── main-layout/
│               │   │   ├── main-layout.component.ts
│               │   │   ├── main-layout.component.html
│               │   │   ├── sidebar/
│               │   │   │   ├── sidebar.component.ts
│               │   │   │   └── sidebar.component.html
│               │   │   └── topbar/
│               │   │       ├── topbar.component.ts
│               │   │       └── topbar.component.html
│               │   ├── auth-layout/
│               │   │   ├── auth-layout.component.ts
│               │   │   └── auth-layout.component.html
│               │   └── pos-layout/
│               │       ├── pos-layout.component.ts
│               │       └── pos-layout.component.html
│               │
│               └── features/                 # ══════ Feature Modules ══════
│                   │
│                   ├── auth/                         # ── Phase 2 ──
│                   │   ├── login/
│                   │   │   ├── login.component.ts
│                   │   │   └── login.component.html
│                   │   └── forgot-password/
│                   │       └── forgot-password.component.ts
│                   │
│                   ├── dashboard/                    # ── Phase 9 ──
│                   │   ├── dashboard.component.ts
│                   │   ├── dashboard.component.html
│                   │   ├── services/
│                   │   │   └── dashboard.service.ts
│                   │   └── components/
│                   │       ├── kpi-cards/kpi-cards.component.ts
│                   │       ├── sales-chart/sales-chart.component.ts
│                   │       ├── top-products/top-products.component.ts
│                   │       ├── category-chart/category-chart.component.ts
│                   │       └── alerts-panel/alerts-panel.component.ts
│                   │
│                   ├── products/                     # ── Phase 3 ──
│                   │   ├── products.routes.ts
│                   │   ├── services/products.service.ts
│                   │   ├── pages/
│                   │   │   ├── product-list/
│                   │   │   │   ├── product-list.component.ts
│                   │   │   │   └── product-list.component.html
│                   │   │   ├── product-create/
│                   │   │   │   ├── product-create.component.ts
│                   │   │   │   └── product-create.component.html
│                   │   │   ├── product-detail/
│                   │   │   │   ├── product-detail.component.ts
│                   │   │   │   └── product-detail.component.html
│                   │   │   └── product-edit/
│                   │   │       ├── product-edit.component.ts
│                   │   │       └── product-edit.component.html
│                   │   └── components/
│                   │       ├── product-form/product-form.component.ts
│                   │       └── ingredient-list/ingredient-list.component.ts
│                   │
│                   ├── categories/                   # ── Phase 3 ──
│                   │   ├── categories.routes.ts
│                   │   ├── services/categories.service.ts
│                   │   └── pages/
│                   │       ├── category-list/category-list.component.ts
│                   │       └── category-form/category-form.component.ts
│                   │
│                   ├── manufacturers/                # ── Phase 3 ──
│                   │   ├── manufacturers.routes.ts
│                   │   ├── services/manufacturers.service.ts
│                   │   └── pages/
│                   │       ├── manufacturer-list/manufacturer-list.component.ts
│                   │       └── manufacturer-form/manufacturer-form.component.ts
│                   │
│                   ├── suppliers/                    # ── Phase 3 ──
│                   │   ├── suppliers.routes.ts
│                   │   ├── services/suppliers.service.ts
│                   │   └── pages/
│                   │       ├── supplier-list/supplier-list.component.ts
│                   │       ├── supplier-detail/supplier-detail.component.ts
│                   │       └── supplier-form/supplier-form.component.ts
│                   │
│                   ├── customers/                    # ── Phase 3 ──
│                   │   ├── customers.routes.ts
│                   │   ├── services/customers.service.ts
│                   │   └── pages/
│                   │       ├── customer-list/customer-list.component.ts
│                   │       ├── customer-detail/customer-detail.component.ts
│                   │       └── customer-form/customer-form.component.ts
│                   │
│                   ├── employees/                    # ── Phase 3 ──
│                   │   ├── employees.routes.ts
│                   │   ├── services/employees.service.ts
│                   │   └── pages/
│                   │       ├── employee-list/employee-list.component.ts
│                   │       └── employee-form/employee-form.component.ts
│                   │
│                   ├── inventory/                    # ── Phase 4 ──
│                   │   ├── inventory.routes.ts
│                   │   ├── services/inventory.service.ts
│                   │   └── pages/
│                   │       ├── stock-levels/stock-levels.component.ts
│                   │       ├── movements/movements.component.ts
│                   │       ├── adjustments/
│                   │       │   ├── adjustment-list.component.ts
│                   │       │   └── adjustment-form.component.ts
│                   │       └── expiry/
│                   │           ├── expiry-dashboard.component.ts
│                   │           └── expiry-list.component.ts
│                   │
│                   ├── batches/                      # ── Phase 4 ──
│                   │   ├── batches.routes.ts
│                   │   ├── services/batches.service.ts
│                   │   └── pages/
│                   │       ├── batch-list/batch-list.component.ts
│                   │       └── batch-detail/batch-detail.component.ts
│                   │
│                   ├── purchase-orders/              # ── Phase 5 ──
│                   │   ├── purchase-orders.routes.ts
│                   │   ├── services/purchase-orders.service.ts
│                   │   └── pages/
│                   │       ├── po-list/po-list.component.ts
│                   │       ├── po-create/po-create.component.ts
│                   │       ├── po-detail/po-detail.component.ts
│                   │       └── po-edit/po-edit.component.ts
│                   │
│                   ├── purchase-receiving/           # ── Phase 5 ──
│                   │   ├── services/purchase-receipts.service.ts
│                   │   └── pages/
│                   │       ├── receive-form/receive-form.component.ts
│                   │       └── receipt-list/receipt-list.component.ts
│                   │
│                   ├── purchase-returns/             # ── Phase 5 ──
│                   │   ├── services/purchase-returns.service.ts
│                   │   └── pages/
│                   │       ├── return-form/return-form.component.ts
│                   │       └── return-list/return-list.component.ts
│                   │
│                   ├── pos/                          # ── Phase 6 ──
│                   │   ├── pos.routes.ts
│                   │   ├── services/pos.service.ts
│                   │   └── pages/
│                   │       └── pos/
│                   │           ├── pos.component.ts
│                   │           ├── pos.component.html
│                   │           └── components/
│                   │               ├── pos-search/pos-search.component.ts
│                   │               ├── pos-cart/pos-cart.component.ts
│                   │               ├── pos-cart-item/pos-cart-item.component.ts
│                   │               ├── pos-payment/pos-payment.component.ts
│                   │               ├── pos-receipt/pos-receipt.component.ts
│                   │               ├── pos-numpad/pos-numpad.component.ts
│                   │               └── pos-customer/pos-customer.component.ts
│                   │
│                   ├── sales/                        # ── Phase 6 ──
│                   │   ├── sales.routes.ts
│                   │   ├── services/sales.service.ts
│                   │   └── pages/
│                   │       ├── sale-list/sale-list.component.ts
│                   │       ├── sale-detail/sale-detail.component.ts
│                   │       └── receipt-view/receipt-view.component.ts
│                   │
│                   ├── sales-returns/                # ── Phase 6 ──
│                   │   ├── services/sales-returns.service.ts
│                   │   └── pages/
│                   │       ├── return-create/return-create.component.ts
│                   │       └── return-list/return-list.component.ts
│                   │
│                   ├── prescriptions/                # ── Phase 7 ──
│                   │   ├── prescriptions.routes.ts
│                   │   ├── services/prescriptions.service.ts
│                   │   └── pages/
│                   │       ├── prescription-list/prescription-list.component.ts
│                   │       ├── prescription-create/prescription-create.component.ts
│                   │       ├── prescription-detail/prescription-detail.component.ts
│                   │       └── components/
│                   │           └── dispense-dialog/dispense-dialog.component.ts
│                   │
│                   ├── expenses/                     # ── Phase 8 ──
│                   │   ├── expenses.routes.ts
│                   │   ├── services/expenses.service.ts
│                   │   └── pages/
│                   │       ├── expense-list/expense-list.component.ts
│                   │       ├── expense-form/expense-form.component.ts
│                   │       └── expense-categories/expense-categories.component.ts
│                   │
│                   ├── payments/                     # ── Phase 8 ──
│                   │   ├── payments.routes.ts
│                   │   ├── services/payments.service.ts
│                   │   └── pages/
│                   │       ├── payment-list/payment-list.component.ts
│                   │       └── payment-form/payment-form.component.ts
│                   │
│                   ├── cash-register/                # ── Phase 8 ──
│                   │   ├── cash-register.routes.ts
│                   │   ├── services/cash-register.service.ts
│                   │   └── pages/
│                   │       ├── cash-dashboard/cash-dashboard.component.ts
│                   │       ├── session-detail/session-detail.component.ts
│                   │       └── components/
│                   │           ├── open-session/open-session.component.ts
│                   │           └── close-session/close-session.component.ts
│                   │
│                   ├── reports/                      # ── Phase 9 ──
│                   │   ├── reports.routes.ts
│                   │   ├── services/reports.service.ts
│                   │   └── pages/
│                   │       ├── reports-index/reports-index.component.ts
│                   │       ├── report-viewer/report-viewer.component.ts
│                   │       └── components/
│                   │           ├── report-filters/report-filters.component.ts
│                   │           └── report-export/report-export.component.ts
│                   │
│                   ├── users/                        # ── Phase 2 ──
│                   │   ├── users.routes.ts
│                   │   ├── services/users.service.ts
│                   │   └── pages/
│                   │       ├── user-list/user-list.component.ts
│                   │       ├── user-create/user-create.component.ts
│                   │       ├── user-detail/user-detail.component.ts
│                   │       └── user-edit/user-edit.component.ts
│                   │
│                   ├── roles/                        # ── Phase 2 ──
│                   │   ├── roles.routes.ts
│                   │   ├── services/roles.service.ts
│                   │   └── pages/
│                   │       ├── role-list/role-list.component.ts
│                   │       └── role-form/role-form.component.ts
│                   │
│                   ├── notifications/                # ── Phase 10 ──
│                   │   ├── services/notifications.service.ts
│                   │   └── pages/
│                   │       └── notification-center/notification-center.component.ts
│                   │
│                   ├── audit-log/                    # ── Phase 10 ──
│                   │   ├── services/audit-log.service.ts
│                   │   └── pages/
│                   │       └── audit-log/audit-log.component.ts
│                   │
│                   └── settings/                     # ── Phase 11 ──
│                       ├── settings.routes.ts
│                       ├── services/settings.service.ts
│                       └── pages/
│                           ├── settings/settings.component.ts
│                           └── components/
│                               ├── pharmacy-settings/pharmacy-settings.component.ts
│                               ├── invoice-settings/invoice-settings.component.ts
│                               ├── notification-settings/notification-settings.component.ts
│                               └── display-settings/display-settings.component.ts
│
├── docker/
│   ├── api.Dockerfile                        # Multi-stage: build → production
│   ├── web.Dockerfile                        # Multi-stage: build → nginx
│   └── nginx.conf                            # SPA routing + API proxy
│
├── docs/
│   ├── MASTER_PLAN.md                        # THIS FILE
│   ├── architecture.md                       # System architecture details
│   ├── business-workflows.md                 # Purchase, Sale, Return, Prescription flows
│   ├── api-reference.md                      # Complete API documentation
│   └── deployment.md                         # Production deployment guide
│
├── scripts/
│   ├── setup.sh                              # One-command project setup
│   ├── setup.ps1                             # Windows setup script
│   └── backup.sh                             # Database backup script
│
└── e2e/                                      # ── Phase 13 ──
    ├── playwright.config.ts
    └── tests/
        ├── auth.spec.ts
        ├── products.spec.ts
        ├── sale-flow.spec.ts
        ├── purchase-flow.spec.ts
        └── permissions.spec.ts
```

---

# 5. DATABASE DESIGN

## 5.1 Enums (18 total)

```prisma
enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum DosageForm {
  TABLET
  CAPSULE
  SYRUP
  INJECTION
  CREAM
  OINTMENT
  GEL
  DROPS
  INHALER
  SUPPOSITORY
  PATCH
  POWDER
  SOLUTION
  SUSPENSION
  SPRAY
  OTHER
}

enum InventoryMovementType {
  PURCHASE
  SALE
  SALE_RETURN
  PURCHASE_RETURN
  ADJUSTMENT_IN
  ADJUSTMENT_OUT
  TRANSFER_IN
  TRANSFER_OUT
  EXPIRED_WRITE_OFF
}

enum StockAdjustmentStatus {
  PENDING
  APPROVED
  REJECTED
}

enum PurchaseOrderStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  ORDERED
  PARTIALLY_RECEIVED
  RECEIVED
  CANCELLED
}

enum SaleStatus {
  COMPLETED
  RETURNED
  PARTIALLY_RETURNED
  CANCELLED
}

enum PaymentStatus {
  PAID
  PARTIALLY_PAID
  UNPAID
  REFUNDED
}

enum PaymentMethod {
  CASH
  CARD
  BANK_TRANSFER
  CHECK
  OTHER
}

enum PaymentType {
  CUSTOMER_PAYMENT
  SUPPLIER_PAYMENT
  EXPENSE_PAYMENT
  SALE_REFUND
  PURCHASE_REFUND
}

enum PrescriptionStatus {
  PENDING
  PARTIALLY_DISPENSED
  DISPENSED
  CANCELLED
}

enum CashSessionStatus {
  OPEN
  CLOSED
}

enum CashMovementType {
  SALE
  SALE_REFUND
  EXPENSE
  DEPOSIT
  WITHDRAWAL
  ADJUSTMENT
}

enum ExpenseStatus {
  PENDING
  APPROVED
  REJECTED
}

enum NotificationType {
  LOW_STOCK
  NEAR_EXPIRY
  EXPIRED
  PENDING_APPROVAL
  PURCHASE_REQUEST
  SYSTEM
  INFO
  WARNING
  ERROR
}
```

## 5.2 Models (38 total)

### Auth & Users (5 models)

```prisma
model User {
  id           String     @id @default(uuid())
  email        String     @unique
  username     String     @unique
  passwordHash String     @map("password_hash")
  firstName    String     @map("first_name")
  lastName     String     @map("last_name")
  phone        String?
  avatarUrl    String?    @map("avatar_url")
  status       UserStatus @default(ACTIVE)
  lastLoginAt  DateTime?  @map("last_login_at")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  deletedAt    DateTime?  @map("deleted_at")

  userRoles          UserRole[]
  employee           Employee?
  sales              Sale[]             @relation("CashierSales")
  salesReturns       SalesReturn[]      @relation("ReturnedBy")
  purchaseOrders     PurchaseOrder[]    @relation("CreatedBy")
  approvedPOs        PurchaseOrder[]    @relation("ApprovedBy")
  purchaseReceipts   PurchaseReceipt[]  @relation("ReceivedBy")
  purchaseReturns    PurchaseReturn[]   @relation("PurchaseReturnedBy")
  stockAdjustments   StockAdjustment[]  @relation("AdjustedBy")
  approvedAdj        StockAdjustment[]  @relation("AdjustmentApprovedBy")
  expenses           Expense[]          @relation("ExpenseCreatedBy")
  approvedExpenses   Expense[]          @relation("ExpenseApprovedBy")
  payments           Payment[]
  cashSessions       CashSession[]
  inventoryMovements InventoryMovement[]
  prescriptions      Prescription[]     @relation("DispensedBy")
  notifications      Notification[]
  auditLogs          AuditLog[]
  documents          Document[]         @relation("UploadedBy")

  @@map("users")
}

model Role {
  id          String  @id @default(uuid())
  name        String  @unique
  displayName String  @map("display_name")
  description String?
  isSystem    Boolean @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  userRoles       UserRole[]
  rolePermissions RolePermission[]

  @@map("roles")
}

model Permission {
  id          String @id @default(uuid())
  module      String
  action      String
  displayName String @map("display_name")
  description String?

  rolePermissions RolePermission[]

  @@unique([module, action])
  @@map("permissions")
}

model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}

model RolePermission {
  roleId       String     @map("role_id")
  permissionId String     @map("permission_id")
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

### Pharmacy & HR (2 models)

```prisma
model Pharmacy {
  id        String   @id @default(uuid())
  name      String
  nameAr    String?  @map("name_ar")
  address   String?
  addressAr String?  @map("address_ar")
  phone     String?
  email     String?
  taxNumber String?  @map("tax_number")
  logo      String?
  currency  String   @default("SAR")
  timezone  String   @default("Asia/Riyadh")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("pharmacies")
}

model Employee {
  id          String    @id @default(uuid())
  userId      String?   @unique @map("user_id")
  firstName   String    @map("first_name")
  lastName    String    @map("last_name")
  phone       String?
  email       String?
  position    String?
  department  String?
  joiningDate DateTime? @map("joining_date")
  salary      Decimal?  @db.Decimal(12, 2)
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user User? @relation(fields: [userId], references: [id])

  @@map("employees")
}
```

### Products & Catalog (4 models)

```prisma
model ProductCategory {
  id          String  @id @default(uuid())
  name        String
  nameAr      String? @map("name_ar")
  parentId    String? @map("parent_id")
  description String?
  sortOrder   Int     @default(0) @map("sort_order")
  isActive    Boolean @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  parent   ProductCategory?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children ProductCategory[] @relation("CategoryHierarchy")
  products Product[]

  @@map("product_categories")
}

model Manufacturer {
  id        String   @id @default(uuid())
  name      String
  country   String?
  phone     String?
  email     String?
  website   String?
  notes     String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  products Product[]

  @@map("manufacturers")
}

model Product {
  id                   String      @id @default(uuid())
  name                 String
  nameAr               String?     @map("name_ar")
  genericName          String?     @map("generic_name")
  brandName            String?     @map("brand_name")
  barcode              String?     @unique
  sku                  String?     @unique
  categoryId           String?     @map("category_id")
  manufacturerId       String?     @map("manufacturer_id")
  dosageForm           DosageForm? @map("dosage_form")
  strength             String?
  packageSize          String?     @map("package_size")
  unit                 String      @default("piece")
  purchasePrice        Decimal     @default(0) @map("purchase_price") @db.Decimal(12, 2)
  sellingPrice         Decimal     @default(0) @map("selling_price") @db.Decimal(12, 2)
  minSellingPrice      Decimal?    @map("min_selling_price") @db.Decimal(12, 2)
  taxRate              Decimal     @default(0) @map("tax_rate") @db.Decimal(5, 2)
  reorderLevel         Int         @default(10) @map("reorder_level")
  prescriptionRequired Boolean     @default(false) @map("prescription_required")
  description          String?
  descriptionAr        String?     @map("description_ar")
  storageInstructions  String?     @map("storage_instructions")
  isActive             Boolean     @default(true) @map("is_active")
  createdAt            DateTime    @default(now()) @map("created_at")
  updatedAt            DateTime    @updatedAt @map("updated_at")
  deletedAt            DateTime?   @map("deleted_at")

  category             ProductCategory?     @relation(fields: [categoryId], references: [id])
  manufacturer         Manufacturer?        @relation(fields: [manufacturerId], references: [id])
  ingredients          ProductIngredient[]
  batches              Batch[]
  inventoryMovements   InventoryMovement[]
  saleItems            SaleItem[]
  purchaseOrderItems   PurchaseOrderItem[]
  purchaseReceiptItems PurchaseReceiptItem[]
  purchaseReturnItems  PurchaseReturnItem[]
  salesReturnItems     SalesReturnItem[]
  prescriptionItems    PrescriptionItem[]
  stockAdjustments     StockAdjustment[]

  @@index([categoryId])
  @@index([manufacturerId])
  @@index([barcode])
  @@index([sku])
  @@index([name])
  @@map("products")
}

model ProductIngredient {
  id             String  @id @default(uuid())
  productId      String  @map("product_id")
  ingredientName String  @map("ingredient_name")
  strength       String?
  unit           String?

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@map("product_ingredients")
}
```

### Inventory (3 models)

```prisma
model Batch {
  id                String   @id @default(uuid())
  productId         String   @map("product_id")
  batchNumber       String   @map("batch_number")
  expiryDate        DateTime @map("expiry_date")
  purchasePrice     Decimal  @map("purchase_price") @db.Decimal(12, 2)
  sellingPrice      Decimal  @map("selling_price") @db.Decimal(12, 2)
  quantity          Int      @default(0)
  remainingQuantity Int      @default(0) @map("remaining_quantity")
  supplierId        String?  @map("supplier_id")
  purchaseReceiptId String?  @map("purchase_receipt_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  product            Product          @relation(fields: [productId], references: [id])
  supplier           Supplier?        @relation(fields: [supplierId], references: [id])
  purchaseReceipt    PurchaseReceipt? @relation(fields: [purchaseReceiptId], references: [id])
  inventoryMovements InventoryMovement[]
  saleItems          SaleItem[]
  salesReturnItems   SalesReturnItem[]
  purchaseReturnItems PurchaseReturnItem[]
  stockAdjustments   StockAdjustment[]

  @@unique([productId, batchNumber])
  @@index([productId])
  @@index([expiryDate])
  @@index([supplierId])
  @@map("batches")
}

model InventoryMovement {
  id             String                @id @default(uuid())
  productId      String                @map("product_id")
  batchId        String?               @map("batch_id")
  type           InventoryMovementType
  quantity       Int
  beforeQuantity Int                   @map("before_quantity")
  afterQuantity  Int                   @map("after_quantity")
  referenceType  String?               @map("reference_type")
  referenceId    String?               @map("reference_id")
  notes          String?
  userId         String?               @map("user_id")
  createdAt      DateTime              @default(now()) @map("created_at")

  product Product @relation(fields: [productId], references: [id])
  batch   Batch?  @relation(fields: [batchId], references: [id])
  user    User?   @relation(fields: [userId], references: [id])

  @@index([productId])
  @@index([batchId])
  @@index([type])
  @@index([createdAt])
  @@map("inventory_movements")
}

model StockAdjustment {
  id           String                @id @default(uuid())
  productId    String                @map("product_id")
  batchId      String?               @map("batch_id")
  type         InventoryMovementType
  quantity     Int
  reason       String
  notes        String?
  adjustedById String                @map("adjusted_by_id")
  approvedById String?               @map("approved_by_id")
  status       StockAdjustmentStatus @default(PENDING)
  createdAt    DateTime              @default(now()) @map("created_at")
  updatedAt    DateTime              @updatedAt @map("updated_at")

  product    Product @relation(fields: [productId], references: [id])
  batch      Batch?  @relation(fields: [batchId], references: [id])
  adjustedBy User    @relation("AdjustedBy", fields: [adjustedById], references: [id])
  approvedBy User?   @relation("AdjustmentApprovedBy", fields: [approvedById], references: [id])

  @@map("stock_adjustments")
}
```

### Customers & Prescriptions (3 models)

```prisma
model Customer {
  id          String    @id @default(uuid())
  name        String
  phone       String?
  email       String?
  address     String?
  dateOfBirth DateTime? @map("date_of_birth")
  notes       String?
  balance     Decimal   @default(0) @db.Decimal(12, 2)
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  sales         Sale[]
  salesReturns  SalesReturn[]
  prescriptions Prescription[]
  payments      Payment[] @relation("CustomerPayments")

  @@index([name])
  @@index([phone])
  @@map("customers")
}

model Prescription {
  id                 String             @id @default(uuid())
  prescriptionNumber String             @unique @map("prescription_number")
  customerId         String             @map("customer_id")
  doctorName         String?            @map("doctor_name")
  doctorPhone        String?            @map("doctor_phone")
  issueDate          DateTime           @map("issue_date")
  status             PrescriptionStatus @default(PENDING)
  notes              String?
  dispensedById      String?            @map("dispensed_by_id")
  dispensedAt        DateTime?          @map("dispensed_at")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  customer    Customer          @relation(fields: [customerId], references: [id])
  dispensedBy User?             @relation("DispensedBy", fields: [dispensedById], references: [id])
  items       PrescriptionItem[]
  sales       Sale[]

  @@index([customerId])
  @@index([status])
  @@map("prescriptions")
}

model PrescriptionItem {
  id                 String  @id @default(uuid())
  prescriptionId     String  @map("prescription_id")
  productId          String  @map("product_id")
  quantity           Int
  dosageInstructions String? @map("dosage_instructions")
  dispensedQuantity  Int     @default(0) @map("dispensed_quantity")
  notes              String?

  prescription Prescription @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  product      Product      @relation(fields: [productId], references: [id])

  @@map("prescription_items")
}
```

### Suppliers & Purchases (7 models)

```prisma
model Supplier {
  id             String   @id @default(uuid())
  name           String
  contactPerson  String?  @map("contact_person")
  phone          String?
  email          String?
  address        String?
  taxNumber      String?  @map("tax_number")
  openingBalance Decimal  @default(0) @map("opening_balance") @db.Decimal(12, 2)
  currentBalance Decimal  @default(0) @map("current_balance") @db.Decimal(12, 2)
  notes          String?
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  purchaseOrders   PurchaseOrder[]
  purchaseReceipts PurchaseReceipt[]
  purchaseReturns  PurchaseReturn[]
  batches          Batch[]
  payments         Payment[] @relation("SupplierPayments")

  @@index([name])
  @@map("suppliers")
}

model PurchaseOrder {
  id                   String              @id @default(uuid())
  poNumber             String              @unique @map("po_number")
  supplierId           String              @map("supplier_id")
  orderDate            DateTime            @map("order_date")
  expectedDeliveryDate DateTime?           @map("expected_delivery_date")
  status               PurchaseOrderStatus @default(DRAFT)
  subtotal             Decimal             @default(0) @db.Decimal(12, 2)
  taxAmount            Decimal             @default(0) @map("tax_amount") @db.Decimal(12, 2)
  discountAmount       Decimal             @default(0) @map("discount_amount") @db.Decimal(12, 2)
  totalAmount          Decimal             @default(0) @map("total_amount") @db.Decimal(12, 2)
  notes                String?
  createdById          String              @map("created_by_id")
  approvedById         String?             @map("approved_by_id")
  approvedAt           DateTime?           @map("approved_at")
  createdAt            DateTime            @default(now()) @map("created_at")
  updatedAt            DateTime            @updatedAt @map("updated_at")

  supplier   Supplier            @relation(fields: [supplierId], references: [id])
  createdBy  User                @relation("CreatedBy", fields: [createdById], references: [id])
  approvedBy User?               @relation("ApprovedBy", fields: [approvedById], references: [id])
  items      PurchaseOrderItem[]
  receipts   PurchaseReceipt[]

  @@index([supplierId])
  @@index([status])
  @@index([createdAt])
  @@map("purchase_orders")
}

model PurchaseOrderItem {
  id               String  @id @default(uuid())
  purchaseOrderId  String  @map("purchase_order_id")
  productId        String  @map("product_id")
  quantity         Int
  receivedQuantity Int     @default(0) @map("received_quantity")
  unitPrice        Decimal @map("unit_price") @db.Decimal(12, 2)
  discount         Decimal @default(0) @db.Decimal(12, 2)
  taxRate          Decimal @default(0) @map("tax_rate") @db.Decimal(5, 2)
  totalPrice       Decimal @map("total_price") @db.Decimal(12, 2)

  purchaseOrder PurchaseOrder       @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  product       Product             @relation(fields: [productId], references: [id])
  receiptItems  PurchaseReceiptItem[]

  @@map("purchase_order_items")
}

model PurchaseReceipt {
  id              String    @id @default(uuid())
  receiptNumber   String    @unique @map("receipt_number")
  purchaseOrderId String?   @map("purchase_order_id")
  supplierId      String    @map("supplier_id")
  receiptDate     DateTime  @map("receipt_date")
  receivedById    String    @map("received_by_id")
  invoiceNumber   String?   @map("invoice_number")
  invoiceDate     DateTime? @map("invoice_date")
  subtotal        Decimal   @default(0) @db.Decimal(12, 2)
  taxAmount       Decimal   @default(0) @map("tax_amount") @db.Decimal(12, 2)
  discountAmount  Decimal   @default(0) @map("discount_amount") @db.Decimal(12, 2)
  totalAmount     Decimal   @default(0) @map("total_amount") @db.Decimal(12, 2)
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")

  purchaseOrder PurchaseOrder?       @relation(fields: [purchaseOrderId], references: [id])
  supplier      Supplier             @relation(fields: [supplierId], references: [id])
  receivedBy    User                 @relation("ReceivedBy", fields: [receivedById], references: [id])
  items         PurchaseReceiptItem[]
  batches       Batch[]

  @@index([supplierId])
  @@index([purchaseOrderId])
  @@map("purchase_receipts")
}

model PurchaseReceiptItem {
  id                  String    @id @default(uuid())
  purchaseReceiptId   String    @map("purchase_receipt_id")
  purchaseOrderItemId String?   @map("purchase_order_item_id")
  productId           String    @map("product_id")
  receivedQuantity    Int       @map("received_quantity")
  unitPrice           Decimal   @map("unit_price") @db.Decimal(12, 2)
  batchNumber         String?   @map("batch_number")
  expiryDate          DateTime? @map("expiry_date")
  totalPrice          Decimal   @map("total_price") @db.Decimal(12, 2)

  purchaseReceipt   PurchaseReceipt    @relation(fields: [purchaseReceiptId], references: [id], onDelete: Cascade)
  purchaseOrderItem PurchaseOrderItem? @relation(fields: [purchaseOrderItemId], references: [id])
  product           Product            @relation(fields: [productId], references: [id])

  @@map("purchase_receipt_items")
}

model PurchaseReturn {
  id                String   @id @default(uuid())
  returnNumber      String   @unique @map("return_number")
  purchaseReceiptId String?  @map("purchase_receipt_id")
  supplierId        String   @map("supplier_id")
  returnDate        DateTime @map("return_date")
  reason            String?
  subtotal          Decimal  @default(0) @db.Decimal(12, 2)
  taxAmount         Decimal  @default(0) @map("tax_amount") @db.Decimal(12, 2)
  totalAmount       Decimal  @default(0) @map("total_amount") @db.Decimal(12, 2)
  status            String   @default("PENDING")
  returnedById      String   @map("returned_by_id")
  notes             String?
  createdAt         DateTime @default(now()) @map("created_at")

  supplier   Supplier             @relation(fields: [supplierId], references: [id])
  returnedBy User                 @relation("PurchaseReturnedBy", fields: [returnedById], references: [id])
  items      PurchaseReturnItem[]

  @@index([supplierId])
  @@map("purchase_returns")
}

model PurchaseReturnItem {
  id               String  @id @default(uuid())
  purchaseReturnId String  @map("purchase_return_id")
  productId        String  @map("product_id")
  batchId          String? @map("batch_id")
  quantity         Int
  unitPrice        Decimal @map("unit_price") @db.Decimal(12, 2)
  totalPrice       Decimal @map("total_price") @db.Decimal(12, 2)
  reason           String?

  purchaseReturn PurchaseReturn @relation(fields: [purchaseReturnId], references: [id], onDelete: Cascade)
  product        Product        @relation(fields: [productId], references: [id])
  batch          Batch?         @relation(fields: [batchId], references: [id])

  @@map("purchase_return_items")
}
```

### Sales (5 models)

```prisma
model Sale {
  id             String        @id @default(uuid())
  invoiceNumber  String        @unique @map("invoice_number")
  saleDate       DateTime      @map("sale_date")
  customerId     String?       @map("customer_id")
  prescriptionId String?       @map("prescription_id")
  subtotal       Decimal       @default(0) @db.Decimal(12, 2)
  taxAmount      Decimal       @default(0) @map("tax_amount") @db.Decimal(12, 2)
  discountAmount Decimal       @default(0) @map("discount_amount") @db.Decimal(12, 2)
  totalAmount    Decimal       @default(0) @map("total_amount") @db.Decimal(12, 2)
  paidAmount     Decimal       @default(0) @map("paid_amount") @db.Decimal(12, 2)
  changeAmount   Decimal       @default(0) @map("change_amount") @db.Decimal(12, 2)
  paymentStatus  PaymentStatus @default(PAID) @map("payment_status")
  status         SaleStatus    @default(COMPLETED)
  cashierId      String        @map("cashier_id")
  notes          String?
  createdAt      DateTime      @default(now()) @map("created_at")
  updatedAt      DateTime      @updatedAt @map("updated_at")

  customer     Customer?     @relation(fields: [customerId], references: [id])
  prescription Prescription? @relation(fields: [prescriptionId], references: [id])
  cashier      User          @relation("CashierSales", fields: [cashierId], references: [id])
  items        SaleItem[]
  payments     SalePayment[]
  returns      SalesReturn[]

  @@index([customerId])
  @@index([cashierId])
  @@index([saleDate])
  @@index([status])
  @@map("sales")
}

model SaleItem {
  id         String  @id @default(uuid())
  saleId     String  @map("sale_id")
  productId  String  @map("product_id")
  batchId    String? @map("batch_id")
  quantity   Int
  unitPrice  Decimal @map("unit_price") @db.Decimal(12, 2)
  discount   Decimal @default(0) @db.Decimal(12, 2)
  taxRate    Decimal @default(0) @map("tax_rate") @db.Decimal(5, 2)
  totalPrice Decimal @map("total_price") @db.Decimal(12, 2)

  sale        Sale              @relation(fields: [saleId], references: [id], onDelete: Cascade)
  product     Product           @relation(fields: [productId], references: [id])
  batch       Batch?            @relation(fields: [batchId], references: [id])
  returnItems SalesReturnItem[]

  @@map("sale_items")
}

model SalePayment {
  id            String        @id @default(uuid())
  saleId        String        @map("sale_id")
  paymentMethod PaymentMethod @map("payment_method")
  amount        Decimal       @db.Decimal(12, 2)
  reference     String?
  createdAt     DateTime      @default(now()) @map("created_at")

  sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade)

  @@map("sale_payments")
}

model SalesReturn {
  id           String         @id @default(uuid())
  returnNumber String         @unique @map("return_number")
  saleId       String         @map("sale_id")
  returnDate   DateTime       @map("return_date")
  customerId   String?        @map("customer_id")
  subtotal     Decimal        @default(0) @db.Decimal(12, 2)
  taxAmount    Decimal        @default(0) @map("tax_amount") @db.Decimal(12, 2)
  totalAmount  Decimal        @default(0) @map("total_amount") @db.Decimal(12, 2)
  refundMethod PaymentMethod? @map("refund_method")
  reason       String?
  status       String         @default("COMPLETED")
  returnedById String         @map("returned_by_id")
  notes        String?
  createdAt    DateTime       @default(now()) @map("created_at")

  sale       Sale              @relation(fields: [saleId], references: [id])
  customer   Customer?         @relation(fields: [customerId], references: [id])
  returnedBy User              @relation("ReturnedBy", fields: [returnedById], references: [id])
  items      SalesReturnItem[]

  @@index([saleId])
  @@map("sales_returns")
}

model SalesReturnItem {
  id            String  @id @default(uuid())
  salesReturnId String  @map("sales_return_id")
  saleItemId    String  @map("sale_item_id")
  productId     String  @map("product_id")
  batchId       String? @map("batch_id")
  quantity      Int
  unitPrice     Decimal @map("unit_price") @db.Decimal(12, 2)
  totalPrice    Decimal @map("total_price") @db.Decimal(12, 2)
  reason        String?

  salesReturn SalesReturn @relation(fields: [salesReturnId], references: [id], onDelete: Cascade)
  saleItem    SaleItem    @relation(fields: [saleItemId], references: [id])
  product     Product     @relation(fields: [productId], references: [id])
  batch       Batch?      @relation(fields: [batchId], references: [id])

  @@map("sales_return_items")
}
```

### Finance (6 models)

```prisma
model CashRegister {
  id        String   @id @default(uuid())
  name      String
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  sessions CashSession[]

  @@map("cash_registers")
}

model CashSession {
  id                     String            @id @default(uuid())
  cashRegisterId         String            @map("cash_register_id")
  userId                 String            @map("user_id")
  openingBalance         Decimal           @map("opening_balance") @db.Decimal(12, 2)
  closingBalance         Decimal?          @map("closing_balance") @db.Decimal(12, 2)
  expectedClosingBalance Decimal?          @map("expected_closing_balance") @db.Decimal(12, 2)
  openedAt               DateTime          @map("opened_at")
  closedAt               DateTime?         @map("closed_at")
  status                 CashSessionStatus @default(OPEN)
  notes                  String?

  cashRegister CashRegister   @relation(fields: [cashRegisterId], references: [id])
  user         User           @relation(fields: [userId], references: [id])
  movements    CashMovement[]

  @@index([cashRegisterId])
  @@index([userId])
  @@map("cash_sessions")
}

model CashMovement {
  id            String           @id @default(uuid())
  cashSessionId String           @map("cash_session_id")
  type          CashMovementType
  amount        Decimal          @db.Decimal(12, 2)
  referenceType String?          @map("reference_type")
  referenceId   String?          @map("reference_id")
  description   String?
  createdAt     DateTime         @default(now()) @map("created_at")

  cashSession CashSession @relation(fields: [cashSessionId], references: [id])

  @@index([cashSessionId])
  @@map("cash_movements")
}

model ExpenseCategory {
  id          String   @id @default(uuid())
  name        String
  nameAr      String?  @map("name_ar")
  description String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  expenses Expense[]

  @@map("expense_categories")
}

model Expense {
  id                String        @id @default(uuid())
  expenseCategoryId String?       @map("expense_category_id")
  amount            Decimal       @db.Decimal(12, 2)
  date              DateTime
  paymentMethod     PaymentMethod @map("payment_method")
  description       String?
  attachmentUrl     String?       @map("attachment_url")
  userId            String        @map("user_id")
  approvedById      String?       @map("approved_by_id")
  status            ExpenseStatus @default(PENDING)
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  category   ExpenseCategory? @relation(fields: [expenseCategoryId], references: [id])
  createdBy  User             @relation("ExpenseCreatedBy", fields: [userId], references: [id])
  approvedBy User?            @relation("ExpenseApprovedBy", fields: [approvedById], references: [id])
  payments   Payment[]

  @@index([date])
  @@index([status])
  @@map("expenses")
}

model Payment {
  id            String        @id @default(uuid())
  type          PaymentType
  amount        Decimal       @db.Decimal(12, 2)
  date          DateTime
  paymentMethod PaymentMethod @map("payment_method")
  reference     String?
  customerId    String?       @map("customer_id")
  supplierId    String?       @map("supplier_id")
  expenseId     String?       @map("expense_id")
  saleId        String?       @map("sale_id")
  userId        String        @map("user_id")
  notes         String?
  createdAt     DateTime      @default(now()) @map("created_at")

  customer Customer? @relation("CustomerPayments", fields: [customerId], references: [id])
  supplier Supplier? @relation("SupplierPayments", fields: [supplierId], references: [id])
  expense  Expense?  @relation(fields: [expenseId], references: [id])
  user     User      @relation(fields: [userId], references: [id])

  @@index([type])
  @@index([date])
  @@index([customerId])
  @@index([supplierId])
  @@map("payments")
}
```

### System (4 models)

```prisma
model Notification {
  id         String           @id @default(uuid())
  userId     String           @map("user_id")
  type       NotificationType
  title      String
  titleAr    String?          @map("title_ar")
  message    String
  messageAr  String?          @map("message_ar")
  entityType String?          @map("entity_type")
  entityId   String?          @map("entity_id")
  isRead     Boolean          @default(false) @map("is_read")
  readAt     DateTime?        @map("read_at")
  createdAt  DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}

model Document {
  id           String   @id @default(uuid())
  fileName     String   @map("file_name")
  originalName String   @map("original_name")
  mimeType     String   @map("mime_type")
  size         Int
  path         String
  entityType   String?  @map("entity_type")
  entityId     String?  @map("entity_id")
  uploadedById String   @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  uploadedBy User @relation("UploadedBy", fields: [uploadedById], references: [id])

  @@index([entityType, entityId])
  @@map("documents")
}

model AuditLog {
  id            String   @id @default(uuid())
  userId        String?  @map("user_id")
  action        String
  entityType    String   @map("entity_type")
  entityId      String?  @map("entity_id")
  previousValue Json?    @map("previous_value")
  newValue      Json?    @map("new_value")
  ipAddress     String?  @map("ip_address")
  userAgent     String?  @map("user_agent")
  createdAt     DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([entityType])
  @@index([createdAt])
  @@map("audit_logs")
}

model SystemSetting {
  id          String   @id @default(uuid())
  key         String   @unique
  value       String
  type        String   @default("string")
  group       String   @default("general")
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("system_settings")
}
```

---

# 23. API REFERENCE

## Complete Endpoint List (100+ endpoints)

```
# ═══════════════ AUTHENTICATION ═══════════════
POST   /api/v1/auth/login                    # Login → { user, accessToken, refreshToken }
POST   /api/v1/auth/logout                   # Logout → 204
POST   /api/v1/auth/refresh                  # Refresh tokens → { accessToken, refreshToken }
POST   /api/v1/auth/change-password          # Change password → { message }
GET    /api/v1/auth/me                       # Current user → { user, roles, permissions }

# ═══════════════ USERS ═══════════════
GET    /api/v1/users                         # List users (paginated, filterable)
POST   /api/v1/users                         # Create user
GET    /api/v1/users/:id                     # User detail
PATCH  /api/v1/users/:id                     # Update user
PATCH  /api/v1/users/:id/activate            # Activate user
PATCH  /api/v1/users/:id/deactivate          # Deactivate user
POST   /api/v1/users/:id/reset-password      # Reset password

# ═══════════════ ROLES ═══════════════
GET    /api/v1/roles                         # List all roles
POST   /api/v1/roles                         # Create role
GET    /api/v1/roles/:id                     # Role detail with permissions
PATCH  /api/v1/roles/:id                     # Update role
DELETE /api/v1/roles/:id                     # Delete role (non-system only)
PUT    /api/v1/roles/:id/permissions         # Assign permissions to role

# ═══════════════ PERMISSIONS ═══════════════
GET    /api/v1/permissions                   # List all permissions (grouped by module)

# ═══════════════ PRODUCTS ═══════════════
GET    /api/v1/products                      # List (paginated, filterable by category/manufacturer/dosage/stock)
POST   /api/v1/products                      # Create product
GET    /api/v1/products/:id                  # Product detail with ingredients, batches, stock
PATCH  /api/v1/products/:id                  # Update product
DELETE /api/v1/products/:id                  # Soft-delete product
GET    /api/v1/products/barcode/:code        # Lookup by barcode
GET    /api/v1/products/export               # Export CSV

# ═══════════════ CATEGORIES ═══════════════
GET    /api/v1/categories                    # Flat list with product counts
GET    /api/v1/categories/tree               # Hierarchical tree
POST   /api/v1/categories                    # Create category
PATCH  /api/v1/categories/:id               # Update category
DELETE /api/v1/categories/:id               # Delete (only if no products)

# ═══════════════ MANUFACTURERS ═══════════════
GET    /api/v1/manufacturers                 # List with product counts
POST   /api/v1/manufacturers                 # Create
PATCH  /api/v1/manufacturers/:id             # Update
DELETE /api/v1/manufacturers/:id             # Delete (only if no products)

# ═══════════════ SUPPLIERS ═══════════════
GET    /api/v1/suppliers                     # List with balance
POST   /api/v1/suppliers                     # Create
GET    /api/v1/suppliers/:id                 # Detail with balance
PATCH  /api/v1/suppliers/:id                 # Update
GET    /api/v1/suppliers/:id/statement       # Financial statement
GET    /api/v1/suppliers/:id/purchases       # Purchase history

# ═══════════════ CUSTOMERS ═══════════════
GET    /api/v1/customers                     # List with balance
POST   /api/v1/customers                     # Create
GET    /api/v1/customers/:id                 # Detail with balance
PATCH  /api/v1/customers/:id                 # Update
GET    /api/v1/customers/:id/statement       # Financial statement
GET    /api/v1/customers/:id/sales           # Sales history
GET    /api/v1/customers/:id/prescriptions   # Prescription history

# ═══════════════ EMPLOYEES ═══════════════
GET    /api/v1/employees                     # List
POST   /api/v1/employees                     # Create
GET    /api/v1/employees/:id                 # Detail
PATCH  /api/v1/employees/:id                 # Update
PATCH  /api/v1/employees/:id/link-user       # Link to user account

# ═══════════════ INVENTORY ═══════════════
GET    /api/v1/inventory/stock-levels        # Product stock summary
GET    /api/v1/inventory/movements           # Movement history (paginated)
GET    /api/v1/inventory/low-stock           # Products below reorder level
GET    /api/v1/inventory/valuation           # Total stock value
POST   /api/v1/inventory/adjustments         # Create stock adjustment
GET    /api/v1/inventory/adjustments         # List adjustments
PATCH  /api/v1/inventory/adjustments/:id/approve  # Approve adjustment
PATCH  /api/v1/inventory/adjustments/:id/reject   # Reject adjustment

# ═══════════════ BATCHES ═══════════════
GET    /api/v1/batches                       # All batches (paginated)
GET    /api/v1/batches/product/:productId    # Batches for specific product
GET    /api/v1/batches/expiry/expired        # Expired batches
GET    /api/v1/batches/expiry/near           # Near-expiry (query: days=30|60|90)

# ═══════════════ PURCHASE ORDERS ═══════════════
GET    /api/v1/purchase-orders               # List with status filter
POST   /api/v1/purchase-orders               # Create PO (DRAFT)
GET    /api/v1/purchase-orders/:id           # PO detail with items & receipts
PATCH  /api/v1/purchase-orders/:id           # Update (DRAFT only)
POST   /api/v1/purchase-orders/:id/submit    # Submit for approval
POST   /api/v1/purchase-orders/:id/approve   # Approve
POST   /api/v1/purchase-orders/:id/reject    # Reject
POST   /api/v1/purchase-orders/:id/cancel    # Cancel

# ═══════════════ PURCHASE RECEIPTS ═══════════════
GET    /api/v1/purchase-receipts             # List receipts
POST   /api/v1/purchase-receipts             # Create receipt (with batches)
GET    /api/v1/purchase-receipts/:id         # Receipt detail

# ═══════════════ PURCHASE RETURNS ═══════════════
GET    /api/v1/purchase-returns              # List returns
POST   /api/v1/purchase-returns              # Create return
GET    /api/v1/purchase-returns/:id          # Return detail

# ═══════════════ POS ═══════════════
POST   /api/v1/pos/sale                      # Create sale (transactional)
GET    /api/v1/pos/product-search            # Quick search (query: q=term)
GET    /api/v1/pos/barcode/:code             # Barcode lookup for POS

# ═══════════════ SALES ═══════════════
GET    /api/v1/sales                         # List with filters (date, customer, status)
GET    /api/v1/sales/:id                     # Sale detail with items + payments
GET    /api/v1/sales/receipt/:id             # Receipt data for printing
GET    /api/v1/sales/export                  # Export CSV/PDF

# ═══════════════ SALES RETURNS ═══════════════
GET    /api/v1/sales-returns                 # List returns
POST   /api/v1/sales-returns                 # Create return
GET    /api/v1/sales-returns/:id             # Return detail

# ═══════════════ PRESCRIPTIONS ═══════════════
GET    /api/v1/prescriptions                 # List with status filter
POST   /api/v1/prescriptions                 # Create prescription
GET    /api/v1/prescriptions/:id             # Detail with items + dispensing history
PATCH  /api/v1/prescriptions/:id             # Update prescription
POST   /api/v1/prescriptions/:id/dispense    # Dispense items
POST   /api/v1/prescriptions/:id/cancel      # Cancel prescription

# ═══════════════ EXPENSES ═══════════════
GET    /api/v1/expenses                      # List with filters
POST   /api/v1/expenses                      # Create expense
PATCH  /api/v1/expenses/:id                  # Update expense
POST   /api/v1/expenses/:id/approve          # Approve expense
POST   /api/v1/expenses/:id/reject           # Reject expense
GET    /api/v1/expense-categories            # List categories
POST   /api/v1/expense-categories            # Create category
PATCH  /api/v1/expense-categories/:id        # Update category

# ═══════════════ PAYMENTS ═══════════════
GET    /api/v1/payments                      # List with type filter
POST   /api/v1/payments                      # Record payment
GET    /api/v1/payments/:id                  # Payment detail

# ═══════════════ CASH REGISTER ═══════════════
GET    /api/v1/cash-register                 # Active registers
POST   /api/v1/cash-register/open            # Open session
POST   /api/v1/cash-register/close           # Close session
GET    /api/v1/cash-register/session         # Current session
GET    /api/v1/cash-register/movements       # Session movements
GET    /api/v1/cash-register/summary         # Session financial summary

# ═══════════════ DASHBOARD ═══════════════
GET    /api/v1/dashboard/summary             # KPIs (today, week, month)
GET    /api/v1/dashboard/sales-chart         # Sales trend data
GET    /api/v1/dashboard/top-products        # Top selling products
GET    /api/v1/dashboard/categories          # Sales by category
GET    /api/v1/dashboard/alerts              # Low stock + expiry + pending

# ═══════════════ REPORTS (20 types) ═══════════════
GET    /api/v1/reports/sales                 # Sales report
GET    /api/v1/reports/purchases             # Purchase report
GET    /api/v1/reports/profit                # Profit & loss
GET    /api/v1/reports/product-sales         # Product sales analysis
GET    /api/v1/reports/category-sales        # Category performance
GET    /api/v1/reports/customers             # Customer report
GET    /api/v1/reports/suppliers             # Supplier report
GET    /api/v1/reports/inventory             # Current inventory
GET    /api/v1/reports/stock-movements       # Movement history
GET    /api/v1/reports/low-stock             # Below reorder level
GET    /api/v1/reports/expiry                # Expiry status
GET    /api/v1/reports/expired               # Expired products
GET    /api/v1/reports/purchase-returns       # Purchase returns
GET    /api/v1/reports/sales-returns         # Sales returns
GET    /api/v1/reports/expenses              # Expense analysis
GET    /api/v1/reports/cash-register         # Cash register sessions
GET    /api/v1/reports/payments              # Payment transactions
GET    /api/v1/reports/tax                   # Tax collected/paid
GET    /api/v1/reports/user-activity         # User action report
GET    /api/v1/reports/prescriptions         # Prescription dispensing
GET    /api/v1/reports/:type/export          # Export any report (CSV/PDF)

# ═══════════════ NOTIFICATIONS ═══════════════
GET    /api/v1/notifications                 # User's notifications (paginated)
GET    /api/v1/notifications/unread-count    # Unread count
PATCH  /api/v1/notifications/:id/read        # Mark as read
PATCH  /api/v1/notifications/read-all        # Mark all as read

# ═══════════════ DOCUMENTS ═══════════════
POST   /api/v1/documents/upload              # Upload file
GET    /api/v1/documents/:id/download        # Download file
GET    /api/v1/documents/entity/:type/:id    # Documents for entity
DELETE /api/v1/documents/:id                 # Delete file

# ═══════════════ AUDIT LOG ═══════════════
GET    /api/v1/audit-log                     # Paginated log with filters
GET    /api/v1/audit-log/entity/:type/:id    # Logs for specific entity

# ═══════════════ SETTINGS ═══════════════
GET    /api/v1/settings                      # All settings (grouped)
PATCH  /api/v1/settings                      # Update settings (bulk)
GET    /api/v1/settings/pharmacy             # Pharmacy info
PATCH  /api/v1/settings/pharmacy             # Update pharmacy info
POST   /api/v1/settings/logo                 # Upload pharmacy logo

# ═══════════════ SEARCH ═══════════════
GET    /api/v1/search                        # Global search (query: q=term&types=products,customers)

# ═══════════════ HEALTH ═══════════════
GET    /api/v1/health                        # Health check → { status: "ok" }
```

---

# 24. FRONTEND ROUTES

```
/login                          → Auth Layout → Login Page
/forgot-password                → Auth Layout → Forgot Password Page

/                               → Main Layout (auth guard)
  /dashboard                    → Dashboard
  /pos                          → POS Layout → Point of Sale (full-screen)

  /products                     → Product List
  /products/new                 → Create Product
  /products/:id                 → Product Detail
  /products/:id/edit            → Edit Product

  /categories                   → Category List
  /manufacturers                → Manufacturer List

  /inventory                    → Stock Levels
  /inventory/movements          → Movement History
  /inventory/adjustments        → Stock Adjustments
  /inventory/expiry             → Expiry Management

  /batches                      → Batch List
  /batches/:id                  → Batch Detail

  /suppliers                    → Supplier List
  /suppliers/new                → Create Supplier
  /suppliers/:id                → Supplier Detail

  /customers                    → Customer List
  /customers/new                → Create Customer
  /customers/:id                → Customer Detail

  /employees                    → Employee List
  /employees/new                → Create Employee
  /employees/:id                → Employee Detail

  /purchase-orders              → PO List
  /purchase-orders/new          → Create PO
  /purchase-orders/:id          → PO Detail
  /purchase-orders/:id/edit     → Edit PO
  /purchase-orders/:id/receive  → Receive Against PO

  /purchase-receipts            → Receipt List
  /purchase-returns             → Purchase Return List

  /sales                        → Sales List
  /sales/:id                    → Sale Detail
  /sales-returns                → Sales Return List
  /sales-returns/new/:saleId    → Create Return

  /prescriptions                → Prescription List
  /prescriptions/new            → Create Prescription
  /prescriptions/:id            → Prescription Detail

  /expenses                     → Expense List
  /expenses/new                 → Create Expense
  /expense-categories           → Expense Categories

  /payments                     → Payment List
  /payments/new                 → Create Payment

  /cash-register                → Cash Register Dashboard

  /reports                      → Reports Index
  /reports/:type                → Report Viewer

  /users                        → User List
  /users/new                    → Create User
  /users/:id                    → User Detail
  /users/:id/edit               → Edit User

  /roles                        → Role List
  /roles/new                    → Create Role
  /roles/:id                    → Role Form (edit)

  /notifications                → Notification Center
  /audit-log                    → Audit Log

  /settings                     → Settings Page (tabs)

/**                             → Redirect to /dashboard
```

---

# 25. PERMISSION MATRIX

## Permissions (50+)

```
dashboard.view

products.view
products.create
products.update
products.delete
products.export

categories.view
categories.create
categories.update
categories.delete

manufacturers.view
manufacturers.create
manufacturers.update
manufacturers.delete

suppliers.view
suppliers.create
suppliers.update
suppliers.delete

customers.view
customers.create
customers.update
customers.delete

employees.view
employees.create
employees.update
employees.delete

inventory.view
inventory.adjust
inventory.approve_adjustment

batches.view

sales.view
sales.create
sales.return
sales.export

purchases.view
purchases.create
purchases.approve
purchases.receive
purchases.return

prescriptions.view
prescriptions.create
prescriptions.update
prescriptions.dispense

expenses.view
expenses.create
expenses.update
expenses.approve

payments.view
payments.create

cash_register.view
cash_register.open
cash_register.close

reports.view
reports.export

users.view
users.create
users.update
users.delete

roles.view
roles.create
roles.update
roles.delete

notifications.view

documents.view
documents.upload
documents.delete

audit.view

settings.view
settings.update

search.global
```

## Role-Permission Assignment

```
┌─────────────────────────┬───────┬─────────┬────────────┬─────────┬───────────┬────────────┬────────────┬────────┐
│ Permission              │ Admin │ Manager │ Pharmacist │ Cashier │ Inventory │ Purchasing │ Accountant │ Viewer │
├─────────────────────────┼───────┼─────────┼────────────┼─────────┼───────────┼────────────┼────────────┼────────┤
│ dashboard.view          │  ✅   │   ✅    │     ✅     │   ✅    │    ✅     │     ✅     │     ✅     │   ✅   │
│ products.view           │  ✅   │   ✅    │     ✅     │   ✅    │    ✅     │     ✅     │     ❌     │   ✅   │
│ products.create         │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   ❌   │
│ products.update         │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   ❌   │
│ products.delete         │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ products.export         │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   ❌   │
│ categories.*            │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   👁   │
│ manufacturers.*         │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   👁   │
│ suppliers.*             │  ✅   │   ✅    │     ❌     │   ❌    │    👁     │     ✅     │     👁     │   👁   │
│ customers.*             │  ✅   │   ✅    │     ✅     │   👁    │    ❌     │     ❌     │     👁     │   👁   │
│ employees.*             │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ inventory.view          │  ✅   │   ✅    │     ✅     │   ❌    │    ✅     │     ✅     │     ❌     │   ✅   │
│ inventory.adjust        │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ❌     │     ❌     │   ❌   │
│ inventory.approve       │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ sales.view              │  ✅   │   ✅    │     ✅     │   ✅    │    ❌     │     ❌     │     ✅     │   ✅   │
│ sales.create            │  ✅   │   ✅    │     ✅     │   ✅    │    ❌     │     ❌     │     ❌     │   ❌   │
│ sales.return            │  ✅   │   ✅    │     ✅     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ purchases.view          │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ✅     │     ✅     │   ✅   │
│ purchases.create        │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ✅     │     ❌     │   ❌   │
│ purchases.approve       │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ purchases.receive       │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ✅     │     ❌     │   ❌   │
│ purchases.return        │  ✅   │   ✅    │     ❌     │   ❌    │    ✅     │     ✅     │     ❌     │   ❌   │
│ prescriptions.view      │  ✅   │   ✅    │     ✅     │   ✅    │    ❌     │     ❌     │     ❌     │   ✅   │
│ prescriptions.create    │  ✅   │   ✅    │     ✅     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ prescriptions.dispense  │  ✅   │   ✅    │     ✅     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ expenses.view           │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ✅     │   ✅   │
│ expenses.create         │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ✅     │   ❌   │
│ expenses.approve        │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ payments.*              │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ✅     │   👁   │
│ cash_register.*         │  ✅   │   ✅    │     ✅     │   ✅    │    ❌     │     ❌     │     ✅     │   👁   │
│ reports.view            │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ✅     │   ✅   │
│ reports.export          │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ✅     │   ❌   │
│ users.*                 │  ✅   │   👁    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ roles.*                 │  ✅   │   ❌    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ audit.view              │  ✅   │   ✅    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
│ settings.*              │  ✅   │   👁    │     ❌     │   ❌    │    ❌     │     ❌     │     ❌     │   ❌   │
└─────────────────────────┴───────┴─────────┴────────────┴─────────┴───────────┴────────────┴────────────┴────────┘

Legend: ✅ = Full access  |  👁 = View only  |  ❌ = No access
```

---

# 22. BUSINESS RULES REFERENCE

## Inventory Rules
1. Every stock change MUST create an InventoryMovement record
2. Movement types: PURCHASE, SALE, SALE_RETURN, PURCHASE_RETURN, ADJUSTMENT_IN, ADJUSTMENT_OUT, EXPIRED_WRITE_OFF
3. FEFO (First Expired, First Out) used for sale deductions
4. Cannot have negative stock quantities
5. Low-stock alert when remainingQuantity < reorderLevel
6. Expired batches flagged but NOT auto-removed
7. Stock adjustments require approval (configurable)

## Sales Rules
8. All prices MUST be recalculated on backend (never trust frontend)
9. Cannot sell more than available stock
10. Invoice numbers auto-generated (sequential, unique)
11. Prescription-required products flagged at POS
12. Sale status: COMPLETED → PARTIALLY_RETURNED → RETURNED
13. Payment status: PAID, PARTIALLY_PAID, UNPAID

## Returns Rules
14. Sales returns cannot exceed original sold quantities
15. Sales returns restore inventory (create SALE_RETURN movements)
16. Purchase returns deduct inventory (create PURCHASE_RETURN movements)
17. Returns update customer/supplier balances

## Purchase Rules
18. PO status machine: DRAFT → PENDING_APPROVAL → APPROVED → ORDERED → PARTIALLY_RECEIVED → RECEIVED
19. Only Admin/Manager can approve POs
20. Cannot edit non-DRAFT POs
21. Cannot cancel RECEIVED POs
22. Receiving creates batches with expiry dates
23. Receiving creates InventoryMovements (type: PURCHASE)
24. Receiving updates supplier currentBalance
25. Cannot receive more than ordered quantity

## Financial Rules
26. All money fields use Decimal(12,2) — never floating point
27. Expenses require approval (configurable)
28. Cash session must be open to process cash transactions
29. Closing balance compared to expected for reconciliation
30. Payments update entity balances (customer/supplier)

## Security Rules
31. Passwords hashed with Argon2 (memory: 64MB, iterations: 3, parallelism: 1)
32. Access token: 15 min expiry
33. Refresh token: 7 days expiry, rotated on use
34. Backend permissions enforced on EVERY controller method
35. Frontend hiding is NOT security — backend enforcement is primary
36. System roles cannot be deleted
37. Cannot deactivate last Admin user
38. Audit log records all important operations
39. Audit logs NOT editable by ordinary users

## Data Integrity Rules
40. Unique: barcode, SKU, email, username, invoiceNumber, poNumber, prescriptionNumber
41. Soft-delete for financial records (deletedAt timestamp)
42. All foreign keys have proper ON DELETE behavior
43. Important operations use database transactions ($transaction)
44. Created/updated timestamps on all entities

---

# 21. SEED DATA SPECIFICATION

## Demo Accounts
```
Email                       Password          Role
─────────────────────────────────────────────────────────
admin@pharmacy.local        PharmaPro2024!    Admin
manager@pharmacy.local      PharmaPro2024!    Pharmacy Manager
pharmacist@pharmacy.local   PharmaPro2024!    Pharmacist
cashier@pharmacy.local      PharmaPro2024!    Cashier
inventory@pharmacy.local    PharmaPro2024!    Inventory Manager
purchaser@pharmacy.local    PharmaPro2024!    Purchasing Officer
accountant@pharmacy.local   PharmaPro2024!    Accountant
viewer@pharmacy.local       PharmaPro2024!    Viewer
```

## Sample Products (50)
```
Name                    Generic             Category        Dosage    Price(SAR)
──────────────────────────────────────────────────────────────────────────────
Amoxicillin 500mg       Amoxicillin         Antibiotics     Capsule   24.00
Augmentin 1g            Amoxicillin/Clav    Antibiotics     Tablet    45.00
Azithromycin 250mg      Azithromycin        Antibiotics     Tablet    35.00
Ciprofloxacin 500mg     Ciprofloxacin       Antibiotics     Tablet    28.00
Paracetamol 500mg       Paracetamol         Pain Relief     Tablet     5.00
Ibuprofen 400mg         Ibuprofen           Pain Relief     Tablet     8.00
Voltaren 50mg           Diclofenac          Pain Relief     Tablet    12.00
Aspirin 100mg           Aspirin             Cardiovascular  Tablet     6.00
Lisinopril 10mg         Lisinopril          Cardiovascular  Tablet    15.00
Atorvastatin 20mg       Atorvastatin        Cardiovascular  Tablet    22.00
Amlodipine 5mg          Amlodipine          Cardiovascular  Tablet    18.00
Metformin 850mg         Metformin           Diabetes        Tablet    10.00
Glimepiride 2mg         Glimepiride         Diabetes        Tablet    14.00
Insulin Lantus          Insulin Glargine    Diabetes        Injection 180.00
Ventolin Inhaler        Salbutamol          Respiratory     Inhaler   35.00
Symbicort 160/4.5       Budesonide/Form     Respiratory     Inhaler   120.00
Cetirizine 10mg         Cetirizine          Respiratory     Tablet     7.00
Omeprazole 20mg         Omeprazole          GI              Capsule   12.00
Pantoprazole 40mg       Pantoprazole        GI              Tablet    18.00
Motilium 10mg           Domperidone         GI              Tablet    10.00
Vitamin C 1000mg        Ascorbic Acid       Vitamins        Tablet     8.00
Vitamin D3 5000IU       Cholecalciferol     Vitamins        Capsule   25.00
Omega-3 1000mg          Fish Oil            Vitamins        Capsule   30.00
Calcium + D3            Calcium/VitD        Vitamins        Tablet    20.00
Betadine Solution       Povidone-Iodine     Medical Supply  Solution  15.00
... (25 more realistic products)
```

## Sample Categories (12)
```
Antibiotics, Pain Relief & Anti-inflammatory, Cardiovascular,
Diabetes, Respiratory, Dermatology, Gastrointestinal,
Vitamins & Supplements, Baby Care, Personal Care,
Medical Supplies, Other
```

## Sample Suppliers (10)
```
Al-Dawaa Medical Supplies, Saudi Pharmaceutical Industries (SPIMACO),
Gulf Drug Store, National Medical Warehouse, Al-Hayat Pharma,
Middle East Pharma, Arabian Medical Company, United Drug Distribution,
MedLine Arabia, Crescent Pharma
```

## Sample Customers (20)
```
Ahmed Al-Rashid, Fatima Hassan, Mohammed Al-Qahtani,
Noura Al-Salem, Khalid Ibrahim, Sara Al-Ghamdi,
Omar Mahmoud, Layla Al-Shehri, Hassan Al-Otaibi,
Maryam Al-Dosari, ... (with phone numbers and addresses)
```

---

# 26. FINAL QUALITY AUDIT

## Pre-Completion Checklist

### Frontend (Must Pass All)
- [ ] Every route loads without errors
- [ ] Every page displays correctly
- [ ] Every form submits data to backend
- [ ] Every button triggers a real action
- [ ] Every API integration works end-to-end
- [ ] No browser console errors
- [ ] No broken CSS layouts
- [ ] Responsive: works on 375px, 768px, 1440px
- [ ] RTL: Arabic layout renders correctly
- [ ] LTR: English layout renders correctly
- [ ] All 500 translation keys present in both en.json and ar.json
- [ ] Loading skeleton shown during API calls
- [ ] Empty state shown when no data
- [ ] Error state shown on API failure
- [ ] Confirmation shown before destructive actions
- [ ] Toast notification after successful operations
- [ ] Debounced search on all list pages
- [ ] Pagination on all list pages
- [ ] Sortable columns on data tables

### Backend (Must Pass All)
- [ ] All 100+ API endpoints respond correctly
- [ ] Authentication: login, logout, refresh all work
- [ ] Authorization: every endpoint checks permissions
- [ ] Validation: invalid data rejected with clear errors
- [ ] Error responses: consistent { success, message, statusCode }
- [ ] No N+1 query problems
- [ ] Transactions used for multi-step operations
- [ ] Swagger documentation complete and accurate
- [ ] Rate limiting active on auth endpoints
- [ ] No sensitive data in error responses
- [ ] No passwords or tokens in logs

### Database (Must Pass All)
- [ ] All 38 tables created successfully
- [ ] All migrations run cleanly
- [ ] Seed data loads without errors
- [ ] Foreign key constraints enforced
- [ ] Unique constraints enforced (barcode, SKU, email, invoice numbers)
- [ ] Indexes exist on all FK and search fields
- [ ] Decimal(12,2) used for ALL money fields
- [ ] Soft delete working for financial records
- [ ] Timestamps (createdAt, updatedAt) auto-managed

### Business Logic (Must Pass All)
- [ ] Purchase → Receive → Stock increases ✓
- [ ] Sale → Stock decreases (FEFO) ✓
- [ ] Sale Return → Stock restored ✓
- [ ] Purchase Return → Stock decreased ✓
- [ ] Expense → Cash register updated ✓
- [ ] Sale → Cash register movement created ✓
- [ ] All transactions → Dashboard KPIs updated ✓
- [ ] All transactions → Reports accurate ✓
- [ ] Permission matrix enforced end-to-end ✓
- [ ] Invoice numbers sequential and unique ✓
- [ ] Cannot sell out-of-stock products ✓
- [ ] Cannot return more than sold/purchased ✓
- [ ] Expired products flagged in expiry management ✓
- [ ] Low-stock notifications triggered ✓
- [ ] Audit log records all important actions ✓

### Production (Must Pass All)
- [ ] docker compose up → all services healthy
- [ ] Production build: API compiles without errors
- [ ] Production build: Angular compiles without errors
- [ ] Database migrations run in clean database
- [ ] Seed data populates dashboard immediately
- [ ] All 8 demo accounts can log in
- [ ] README instructions work from scratch on clean machine
- [ ] .env.example has all required variables documented
- [ ] .env is in .gitignore
- [ ] No hardcoded secrets in source code

---

# END OF MASTER PLAN
# ═══════════════════════════════════════════════════════════════════════════════
# Total: 38 DB Models | 18 Enums | 100+ API Endpoints | 50+ Frontend Pages
# Estimated: ~523 files | ~205 backend | ~272 frontend | ~46 config/docs
# ═══════════════════════════════════════════════════════════════════════════════
