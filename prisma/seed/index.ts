import { PrismaClient, type DosageForm } from '@prisma/client';
import { DEFAULT_ROLES, PERMISSION_DEFINITIONS, ROLE_PERMISSIONS, type RoleName } from '@pharmapro/shared';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@pharmacy.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'PharmaPro2024!';
const STAFF_PASSWORD = process.env.STAFF_PASSWORD ?? 'Staff@2024!';

async function seedPermissions(): Promise<void> {
  await prisma.permission.deleteMany({});
  await prisma.permission.createMany({
    data: PERMISSION_DEFINITIONS.map((p) => ({
      module: p.module,
      action: p.action,
      displayName: p.displayName,
      description: p.description,
    })),
  });
  console.log(`seeded ${PERMISSION_DEFINITIONS.length} permissions`);
}

async function seedRoles(): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    const permissionSlugs = ROLE_PERMISSIONS[role.name as RoleName] ?? [];
    const permissionRecords = await prisma.permission.findMany({
      where: { OR: permissionSlugs.map((slug) => ({ module: slug.split('.')[0], action: slug.split('.')[1] })) },
    });
    const permissionIds = permissionRecords.map((p) => p.id);

    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        rolePermissions: {
          deleteMany: {},
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      create: {
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        isSystem: role.isSystem,
        rolePermissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
    });
  }
  console.log(`seeded ${DEFAULT_ROLES.length} roles`);
}

async function seedAdmin(): Promise<void> {
  const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
  if (!adminRole) throw new Error('Admin role missing');

  const passwordHash = await argon2.hash(ADMIN_PASSWORD, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      email: ADMIN_EMAIL,
      username: ADMIN_EMAIL.split('@')[0],
      passwordHash,
      firstName: 'PharmaPro',
      lastName: 'Admin',
      status: 'ACTIVE',
      userRoles: { create: { roleId: adminRole.id } },
    },
  });
  console.log(`admin user ready (${ADMIN_EMAIL})`);
}

async function seedPharmacy(): Promise<void> {
  const existing = await prisma.pharmacy.findFirst();
  if (!existing) {
    await prisma.pharmacy.create({
      data: {
        name: 'Al-Shifa Pharmacy',
        nameAr: 'صيدلية الشفاء',
        address: 'Riyadh, Saudi Arabia',
        addressAr: 'الرياض، المملكة العربية السعودية',
        phone: '+966 11 234 5678',
        email: 'info@alshifa.pharmacy',
        taxNumber: '310123456700003',
        currency: 'SAR',
        timezone: 'Asia/Riyadh',
      },
    });
    console.log('pharmacy record created');
  }
}

async function seedSettings(): Promise<void> {
  const defaults: Array<{ key: string; value: string; type: string; group: string; description: string }> = [
    { key: 'vat_rate', value: '15', type: 'number', group: 'billing', description: 'VAT percentage applied on sales' },
    { key: 'invoice_prefix', value: 'INV', type: 'string', group: 'billing', description: 'Prefix for sales invoices' },
    { key: 'pos_prefix', value: 'POS', type: 'string', group: 'billing', description: 'Prefix for POS receipts' },
    { key: 'po_prefix', value: 'PO', type: 'string', group: 'purchasing', description: 'Prefix for purchase orders' },
    { key: 'expiry_alert_days', value: '90', type: 'number', group: 'inventory', description: 'Days before expiry to flag a batch' },
    { key: 'low_stock_threshold', value: '10', type: 'number', group: 'inventory', description: 'Reorder level default' },
    { key: 'default_language', value: 'ar', type: 'string', group: 'general', description: 'Default UI language' },
  ];
  for (const setting of defaults) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`seeded ${defaults.length} system settings`);
}

async function seedDemoData(): Promise<void> {
  const categoryCount = await prisma.productCategory.count();
  if (categoryCount > 0) return;

  const [analgesics, antibiotics, vitamins, diabetes] = await Promise.all([
    prisma.productCategory.create({ data: { name: 'Analgesics', nameAr: 'مسكنات', sortOrder: 1 } }),
    prisma.productCategory.create({ data: { name: 'Antibiotics', nameAr: 'مضادات حيوية', sortOrder: 2 } }),
    prisma.productCategory.create({ data: { name: 'Vitamins & Supplements', nameAr: 'فيتامينات ومكملات', sortOrder: 3 } }),
    prisma.productCategory.create({ data: { name: 'Diabetes Care', nameAr: 'أدوية السكري', sortOrder: 4 } }),
  ]);

  const [spimaco, jamjoom, novartis] = await Promise.all([
    prisma.manufacturer.create({ data: { name: 'SPIMACO', country: 'Saudi Arabia', website: 'https://www.spimaco.com.sa' } }),
    prisma.manufacturer.create({ data: { name: 'Jamjoom Pharma', country: 'Saudi Arabia', website: 'https://www.jamjoompharma.com' } }),
    prisma.manufacturer.create({ data: { name: 'Novartis', country: 'Switzerland', website: 'https://www.novartis.com' } }),
  ]);

  await Promise.all([
    prisma.supplier.create({
      data: { name: 'Tadawi Supply Co.', contactPerson: 'Ahmed Al-Qahtani', phone: '+966 50 111 2222', taxNumber: '310234567800003', openingBalance: 0, currentBalance: 0 },
    }),
    prisma.supplier.create({
      data: { name: 'Al-Dawaa Distributor', contactPerson: 'Sara Nasser', phone: '+966 55 333 4444', taxNumber: '310345678900003', openingBalance: 0, currentBalance: 0 },
    }),
    prisma.supplier.create({
      data: { name: 'Modern Medical Trading', contactPerson: 'Omar Haddad', phone: '+966 53 777 8888', openingBalance: 0, currentBalance: 0 },
    }),
  ]);

  await Promise.all([
    prisma.customer.create({ data: { name: 'Mohammed Al-Otaibi', phone: '+966 55 111 2233' } }),
    prisma.customer.create({ data: { name: 'Fatima Al-Zahrani', phone: '+966 50 444 5566' } }),
    prisma.customer.create({ data: { name: 'Khalid Al-Ghamdi', phone: '+966 56 777 8899' } }),
    prisma.customer.create({ data: { name: 'Nora Al-Salem', phone: '+966 54 222 3344' } }),
  ]);

  const demoProducts: Array<{
    name: string;
    nameAr: string;
    genericName: string;
    brandName: string;
    dosageForm: DosageForm;
    strength: string;
    categoryId: string;
    manufacturerId: string;
    purchasePrice: number;
    sellingPrice: number;
    barcode: string;
    sku: string;
    batchNumber: string;
    quantity: number;
    expiryMonths: number;
  }> = [
    { name: 'Paracetamol 500mg Tablets', nameAr: 'باراسيتامول 500 ملجم', genericName: 'Paracetamol', brandName: 'Panadol', dosageForm: 'TABLET', strength: '500mg', categoryId: analgesics.id, manufacturerId: novartis.id, purchasePrice: 2.5, sellingPrice: 4.0, barcode: '6281000000010', sku: 'PAR-500-20', batchNumber: 'PA2401', quantity: 200, expiryMonths: 18 },
    { name: 'Ibuprofen 400mg Tablets', nameAr: 'ايبوبروفين 400 ملجم', genericName: 'Ibuprofen', brandName: 'Brufen', dosageForm: 'TABLET', strength: '400mg', categoryId: analgesics.id, manufacturerId: spimaco.id, purchasePrice: 4.5, sellingPrice: 7.0, barcode: '6281000000027', sku: 'IBU-400-20', batchNumber: 'IB2402', quantity: 150, expiryMonths: 24 },
    { name: 'Amoxicillin 500mg Capsules', nameAr: 'أموكسيسيلين 500 ملجم', genericName: 'Amoxicillin', brandName: 'Amoxil', dosageForm: 'CAPSULE', strength: '500mg', categoryId: antibiotics.id, manufacturerId: spimaco.id, purchasePrice: 8.0, sellingPrice: 12.5, barcode: '6281000000034', sku: 'AMO-500-24', batchNumber: 'AM2403', quantity: 90, expiryMonths: 12, },
    { name: 'Azithromycin 250mg Tablets', nameAr: 'أزيثروميسين 250 ملجم', genericName: 'Azithromycin', brandName: 'Azithral', dosageForm: 'TABLET', strength: '250mg', categoryId: antibiotics.id, manufacturerId: jamjoom.id, purchasePrice: 15.0, sellingPrice: 22.0, barcode: '6281000000041', sku: 'AZT-250-6', batchNumber: 'AZ2404', quantity: 60, expiryMonths: 24 },
    { name: 'Vitamin D3 1000 IU Softgels', nameAr: 'فيتامين د3 1000 وحدة', genericName: 'Cholecalciferol', brandName: 'Vit-D', dosageForm: 'CAPSULE', strength: '1000 IU', categoryId: vitamins.id, manufacturerId: jamjoom.id, purchasePrice: 6.0, sellingPrice: 10.0, barcode: '6281000000058', sku: 'VITD-1000-30', batchNumber: 'VD2405', quantity: 120, expiryMonths: 24 },
    { name: 'Multivitamin Syrup 120ml', nameAr: 'فيتامينات متعددة شراب', genericName: 'Multi-vitamin', brandName: 'Centrum Kids', dosageForm: 'SYRUP', strength: '120ml', categoryId: vitamins.id, manufacturerId: novartis.id, purchasePrice: 12.0, sellingPrice: 18.0, barcode: '6281000000065', sku: 'MVM-120', batchNumber: 'MV2406', quantity: 40, expiryMonths: 18 },
    { name: 'Metformin 850mg Tablets', nameAr: 'ميتفورمين 850 ملجم', genericName: 'Metformin', brandName: 'Glucophage', dosageForm: 'TABLET', strength: '850mg', categoryId: diabetes.id, manufacturerId: spimaco.id, purchasePrice: 5.0, sellingPrice: 8.0, barcode: '6281000000072', sku: 'MET-850-30', batchNumber: 'MT2407', quantity: 180, expiryMonths: 24 },
    { name: 'Insulin Glargine 100 IU/ml', nameAr: 'أنسولين جلارجين', genericName: 'Insulin Glargine', brandName: 'Lantus', dosageForm: 'INJECTION', strength: '100 IU/ml', categoryId: diabetes.id, manufacturerId: novartis.id, purchasePrice: 95.0, sellingPrice: 130.0, barcode: '6281000000089', sku: 'INS-100-3', batchNumber: 'IN2408', quantity: 30, expiryMonths: 12 },
  ];

  for (const product of demoProducts) {
    await prisma.product.create({
      data: {
        name: product.name,
        nameAr: product.nameAr,
        genericName: product.genericName,
        brandName: product.brandName,
        dosageForm: product.dosageForm,
        strength: product.strength,
        barcode: product.barcode,
        sku: product.sku,
        categoryId: product.categoryId,
        manufacturerId: product.manufacturerId,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        minSellingPrice: Math.round(product.purchasePrice * 1.05 * 100) / 100,
        taxRate: 15,
        reorderLevel: 10,
        packageSize: product.strength,
      },
    });
  }
  console.log(`seeded ${demoProducts.length} demo products`);
}

async function seedStaffAccountsAndCatalog(): Promise<void> {
  const staffAccounts: Array<{
    email: string;
    role: RoleName;
    firstName: string;
    lastName: string;
    employee: { position: string; department: string; salary: number; joiningDate: Date };
  }> = [
    { email: 'manager@pharmacy.local', role: 'manager', firstName: 'Saleh', lastName: 'Al-Shammari', employee: { position: 'Pharmacy Manager', department: 'Management', salary: 18000, joiningDate: new Date('2022-03-15') } },
    { email: 'pharmacist@pharmacy.local', role: 'pharmacist', firstName: 'Reem', lastName: 'Al-Harbi', employee: { position: 'Senior Pharmacist', department: 'Pharmacy', salary: 11500, joiningDate: new Date('2022-08-01') } },
    { email: 'cashier@pharmacy.local', role: 'cashier', firstName: 'Yousef', lastName: 'Al-Mutairi', employee: { position: 'Cashier', department: 'Sales', salary: 6500, joiningDate: new Date('2023-01-20') } },
    { email: 'inventory@pharmacy.local', role: 'inventory_manager', firstName: 'Fahad', lastName: 'Al-Dossari', employee: { position: 'Inventory Manager', department: 'Inventory', salary: 10500, joiningDate: new Date('2023-05-10') } },
    { email: 'purchaser@pharmacy.local', role: 'purchasing', firstName: 'Abdullah', lastName: 'Al-Enezi', employee: { position: 'Purchasing Officer', department: 'Purchasing', salary: 9500, joiningDate: new Date('2023-09-05') } },
    { email: 'accountant@pharmacy.local', role: 'accountant', firstName: 'Hessa', lastName: 'Al-Anazi', employee: { position: 'Accountant', department: 'Finance', salary: 13000, joiningDate: new Date('2023-11-12') } },
    { email: 'viewer@pharmacy.local', role: 'viewer', firstName: 'Turki', lastName: 'Al-Subaie', employee: { position: 'Store Supervisor', department: 'Operations', salary: 8500, joiningDate: new Date('2024-02-01') } },
  ];

  for (const account of staffAccounts) {
    const role = await prisma.role.findUnique({ where: { name: account.role } });
    if (!role) throw new Error(`role ${account.role} missing`);

    const passwordHash = await argon2.hash(STAFF_PASSWORD, { type: argon2.argon2id });
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash, status: 'ACTIVE' },
      create: {
        email: account.email,
        username: account.email.split('@')[0],
        passwordHash,
        firstName: account.firstName,
        lastName: account.lastName,
        status: 'ACTIVE',
        userRoles: { create: { roleId: role.id } },
      },
    });

    const employee = await prisma.employee.findFirst({ where: { email: account.email } });
    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: user.id, isActive: true },
      });
    } else {
      await prisma.employee.create({
        data: {
          userId: user.id,
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          position: account.employee.position,
          department: account.employee.department,
          salary: account.employee.salary,
          joiningDate: account.employee.joiningDate,
          isActive: true,
        },
      });
    }
  }
  console.log(`ensured ${staffAccounts.length} staff accounts with linked user accounts`);
}

async function seedSuppliersAndCustomers(): Promise<void> {
  const supplierNames = [
    { name: 'Tadawi Supply Co.', contactPerson: 'Ahmed Al-Qahtani', phone: '+966 50 111 2222', taxNumber: '310234567800003' },
    { name: 'Al-Dawaa Distributor', contactPerson: 'Sara Nasser', phone: '+966 55 333 4444', taxNumber: '310345678900003' },
    { name: 'Modern Medical Trading', contactPerson: 'Omar Haddad', phone: '+966 53 777 8888' },
    { name: 'Al-Shifa Medical Supplies', contactPerson: 'Nada Al-Amri', phone: '+966 54 888 9999' },
    { name: 'Riyadh Pharma Distribution', contactPerson: 'Faisal Al-Dakkan', phone: '+966 56 222 3333' },
    { name: 'Gulf Medical Imports', contactPerson: 'Abdulrahman Tariq', phone: '+966 55 444 5555' },
    { name: 'Healthcare Solutions SA', contactPerson: 'Maha Al-Rashid', phone: '+966 50 666 7777' },
    { name: 'Najd Pharmaceutical Supply', contactPerson: 'Sultan Al-Balawi', phone: '+966 53 999 1111' },
    { name: 'Orient Pharma Trading', contactPerson: 'Lina Khouri', phone: '+966 56 333 4444' },
    { name: 'Al-Andalus Medical Wholesale', contactPerson: 'Hani El-Sayed', phone: '+966 54 555 6666' },
  ];
  for (const s of supplierNames) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.supplier.create({ data: { ...s, openingBalance: 0, currentBalance: 0 } });
    }
  }

  const customerNames = [
    'Mohammed Al-Otaibi', 'Fatima Al-Zahrani', 'Khalid Al-Ghamdi', 'Nora Al-Salem',
    'Ahmed Al-Rashid', 'Sara Al-Harbi', 'Omar Al-Qahtani', 'Layla Al-Shehri',
    'Hassan Al-Otaibi', 'Maryam Al-Dossari', 'Yousef Al-Malki', 'Aisha Al-Saud',
    'Ibrahim Al-Fahad', 'Nouf Al-Tamimi', 'Salem Al-Harthi', 'Mona Al-Aqeel',
    'Fahd Al-Osaimi', 'Dana Al-Fares', 'Khalid Al-Sudairy', 'Samira Al-Juhani',
    'Abdulaziz Al-Mohammed', 'Hind Al-Sharif', 'Naif Al-Otaibi', 'Wafaa Al-Ruwaili',
    'Bandar Al-Anzi', 'Asma Al-Ghamdi', 'Rakan Al-Mutairi', 'Lama Al-Khateeb',
    'Saud Al-Jabr', 'Eman Al-Hazmi',
  ];
  for (const c of customerNames) {
    const existing = await prisma.customer.findFirst({ where: { name: c } });
    if (!existing) {
      await prisma.customer.create({ data: { name: c, phone: '+966 5' + Math.floor(10000000 + Math.random() * 89999999) } });
    }
  }
  console.log(`ensured ${supplierNames.length} suppliers and ${customerNames.length} customers`);
}

async function seedExtraCategories(): Promise<void> {
  const extraCategories = [
    { name: 'Respiratory', nameAr: 'جهاز التنفس', sortOrder: 5 },
    { name: 'Dermatology', nameAr: 'الأمراض الجلدية', sortOrder: 6 },
    { name: 'Gastrointestinal', nameAr: 'الجهاز الهضمي', sortOrder: 7 },
    { name: 'Cardiovascular', nameAr: 'القلب والأوعية الدموية', sortOrder: 8 },
    { name: 'Eye & Ear Care', nameAr: 'العناية بالعين والأذن', sortOrder: 9 },
    { name: 'Cough & Cold', nameAr: 'السعال والزكام', sortOrder: 10 },
    { name: 'First Aid', nameAr: 'الإسعافات الأولية', sortOrder: 11 },
    { name: 'Medical Supplies', nameAr: 'المستلزمات الطبية', sortOrder: 12 },
  ];
  let created = 0;
  for (const c of extraCategories) {
    const existing = await prisma.productCategory.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.productCategory.create({ data: c });
      created++;
    }
  }
  console.log(`ensured ${extraCategories.length} additional categories (created ${created})`);
}

async function ensureCategoryId(name: string, nameAr: string, sortOrder: number): Promise<string> {
  let category = await prisma.productCategory.findFirst({ where: { name } });
  if (!category) category = await prisma.productCategory.create({ data: { name, nameAr, sortOrder } });
  return category.id;
}

async function ensureManufacturerId(name: string, country?: string): Promise<string> {
  let manufacturer = await prisma.manufacturer.findFirst({ where: { name } });
  if (!manufacturer) manufacturer = await prisma.manufacturer.create({ data: { name, country } });
  return manufacturer.id;
}

interface CatalogItem {
  sku: string;
  name: string;
  nameAr: string;
  genericName: string;
  brandName: string;
  dosageForm: DosageForm;
  strength: string;
  categoryName: string;
  categoryNameAr: string;
  manufacturerKey: string;
  manufacturerCountry?: string;
  batchNumber: string;
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  expiryMonths: number;
}

const GIANT_CATALOG: CatalogItem[] = [
  // --- Analgesics & Anti-inflammatory (5) ---
  { sku: 'ACE-500-30', name: 'Aceclofenac 100mg Tablets', nameAr: 'أسكوفيناك 100 ملجم', genericName: 'Aceclofenac', brandName: 'Aceclofar', dosageForm: 'TABLET', strength: '100mg', categoryName: 'Analgesics', categoryNameAr: 'مسكنات', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'AC2402', barcode: '6282100000141', purchasePrice: 9.5, sellingPrice: 14.0, quantity: 120, expiryMonths: 24 },
  { sku: 'NAPR-500-20', name: 'Naproxen 500mg Tablets', nameAr: 'نابروكسين 500 ملجم', genericName: 'Naproxen', brandName: 'Naprosyn', dosageForm: 'TABLET', strength: '500mg', categoryName: 'Analgesics', categoryNameAr: 'مسكنات', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'NP2401', barcode: '6282100000158', purchasePrice: 11.0, sellingPrice: 16.0, quantity: 90, expiryMonths: 22 },
  { sku: 'MEF-250-10', name: 'Mefenamic Acid 250mg Capsules', nameAr: 'حمض الميفيناميك 250 ملجم', genericName: 'Mefenamic Acid', brandName: 'Ponstan', dosageForm: 'CAPSULE', strength: '250mg', categoryName: 'Analgesics', categoryNameAr: 'مسكنات', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'MF2403', barcode: '6282100000165', purchasePrice: 5.5, sellingPrice: 8.0, quantity: 150, expiryMonths: 20 },
  { sku: 'KET-10-10', name: 'Ketotifen 1mg Syrup', nameAr: 'كيتوتيفين شراب 1 ملجم', genericName: 'Ketotifen', brandName: 'Zaditen', dosageForm: 'SYRUP', strength: '1mg/5ml', categoryName: 'Analgesics', categoryNameAr: 'مسكنات', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'KT2403', barcode: '6282100000172', purchasePrice: 13.0, sellingPrice: 19.0, quantity: 80, expiryMonths: 12 },
  { sku: 'FUZ-PBAD', name: 'Fusidic Acid 2% Cream', nameAr: 'حمض الفيوزيديك 2% كريم', genericName: 'Fusidic Acid', brandName: 'Fucidin', dosageForm: 'CREAM', strength: '2%', categoryName: 'Dermatology', categoryNameAr: 'الأمراض الجلدية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'FA2405', barcode: '6282100000189', purchasePrice: 14.0, sellingPrice: 21.0, quantity: 70, expiryMonths: 18 },
  // --- Antibiotics & Anti-infectives (5) ---
  { sku: 'AMC-625-14', name: 'Amoxicillin/Clavulanate 625mg', nameAr: 'أموكسيسيلين/كلافولانات 625 ملجم', genericName: 'Amoxicillin Clavulanate', brandName: 'Augmentin', dosageForm: 'TABLET', strength: '625mg', categoryName: 'Antibiotics', categoryNameAr: 'مضادات حيوية', manufacturerKey: 'GSK', manufacturerCountry: 'United Kingdom', batchNumber: 'AM624', barcode: '6282100000196', purchasePrice: 24.0, sellingPrice: 35.0, quantity: 110, expiryMonths: 16 },
  { sku: 'METRO-500-20', name: 'Metronidazole 500mg Tablets', nameAr: 'ميترونيدازول 500 ملجم', genericName: 'Metronidazole', brandName: 'Flagyl', dosageForm: 'TABLET', strength: '500mg', categoryName: 'Antibiotics', categoryNameAr: 'مضادات حيوية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'MT2405', barcode: '6282100000202', purchasePrice: 6.0, sellingPrice: 9.0, quantity: 200, expiryMonths: 24 },
  { sku: 'GEN-80-2', name: 'Gentamicin 80mg Injection', nameAr: 'جنتاميسين 80 ملجم حقن', genericName: 'Gentamicin', brandName: 'Gentycin', dosageForm: 'INJECTION', strength: '80mg/2ml', categoryName: 'Antibiotics', categoryNameAr: 'مضادات حيوية', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'GE2409', barcode: '6282100000219', purchasePrice: 3.5, sellingPrice: 5.0, quantity: 300, expiryMonths: 18 },
  { sku: 'CLAR-250-14', name: 'Clarithromycin 250mg Tablets', nameAr: 'كلاريثروميسين 250 ملجم', genericName: 'Clarithromycin', brandName: 'Klacid', dosageForm: 'TABLET', strength: '250mg', categoryName: 'Antibiotics', categoryNameAr: 'مضادات حيوية', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'CL2406', barcode: '6282100000226', purchasePrice: 18.0, sellingPrice: 27.0, quantity: 90, expiryMonths: 18 },
  { sku: 'CIP-250-10', name: 'Ciprofloxacin 250mg Tablets', nameAr: 'سيبروفلوكساسين 250 ملجم', genericName: 'Ciprofloxacin', brandName: 'Ciprocin', dosageForm: 'TABLET', strength: '250mg', categoryName: 'Antibiotics', categoryNameAr: 'مضادات حيوية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'CIP408', barcode: '6282100000233', purchasePrice: 7.0, sellingPrice: 10.5, quantity: 130, expiryMonths: 24 },
  // --- Vitamins & Supplements (6) ---
  { sku: 'BCOST-100-90', name: 'Vitamin B-Complex 100 Tablets', nameAr: 'فيتامين ب المركب 100 قرص', genericName: 'Vitamin B Complex', brandName: 'Becozym', dosageForm: 'TABLET', strength: '100 tabs', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'BC2402', barcode: '6282100000240', purchasePrice: 22.0, sellingPrice: 33.0, quantity: 85, expiryMonths: 24 },
  { sku: 'FOL-5-30', name: 'Folic Acid 5mg Tablets', nameAr: 'حمض الفوليك 5 ملجم', genericName: 'Folic Acid', brandName: 'Folacid', dosageForm: 'TABLET', strength: '5mg', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'FA2401', barcode: '6282100000257', purchasePrice: 4.0, sellingPrice: 6.0, quantity: 180, expiryMonths: 24 },
  { sku: 'MAG-400-30', name: 'Magnesium 400mg Tablets', nameAr: 'ماغنيسيوم 400 ملجم', genericName: 'Magnesium Oxide', brandName: 'Magtab', dosageForm: 'TABLET', strength: '400mg', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'MG2407', barcode: '6282100000264', purchasePrice: 16.0, sellingPrice: 24.0, quantity: 100, expiryMonths: 24 },
  { sku: 'ZINC-50-30', name: 'Zinc 50mg Tablets', nameAr: 'زينك 50 ملجم', genericName: 'Zinc Sulfate', brandName: 'Zincoff', dosageForm: 'TABLET', strength: '50mg', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'ZC2401', barcode: '6282100000271', purchasePrice: 8.0, sellingPrice: 12.0, quantity: 140, expiryMonths: 18 },
  { sku: 'OMEGA-1000-30', name: 'Omega-3 Fish Oil 1000mg', nameAr: 'أوميغا-3 زيت السمك 1000 ملجم', genericName: 'Omega-3', brandName: 'OmegaSure', dosageForm: 'CAPSULE', strength: '1000mg', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'OM2403', barcode: '6282100000288', purchasePrice: 28.0, sellingPrice: 42.0, quantity: 95, expiryMonths: 18 },
  { sku: 'LAN-TAB', name: 'Ferrous Sulfate 200mg (Iron)', nameAr: 'حديد فيرو سلفات 200 ملجم', genericName: 'Ferrous Sulfate', brandName: 'FerroGrad', dosageForm: 'TABLET', strength: '200mg', categoryName: 'Vitamins & Supplements', categoryNameAr: 'فيتامينات ومكملات', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'IR2408', barcode: '6282100000295', purchasePrice: 10.0, sellingPrice: 15.0, quantity: 160, expiryMonths: 24 },
  // --- Diabetes & Metabolic (5) ---
  { sku: 'GLI-5-100', name: 'Gliclazide 80mg Tablets', nameAr: 'جليكلازيد 80 ملجم', genericName: 'Gliclazide', brandName: 'Diamicron', dosageForm: 'TABLET', strength: '80mg', categoryName: 'Diabetes Care', categoryNameAr: 'أدوية السكري', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'GL2402', barcode: '6282100000301', purchasePrice: 12.0, sellingPrice: 18.0, quantity: 190, expiryMonths: 24 },
  { sku: 'INS-R-100', name: 'Insulin Regular 100 IU/ml', nameAr: 'أنسولين سريع 100 وحدة', genericName: 'Insulin Regular', brandName: 'Actrapid', dosageForm: 'INJECTION', strength: '100 IU/ml', categoryName: 'Diabetes Care', categoryNameAr: 'أدوية السكري', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'IN240ractor', barcode: '6282100000318', purchasePrice: 55.0, sellingPrice: 80.0, quantity: 40, expiryMonths: 18 },
  { sku: 'SILD-50-10', name: 'Glibenclamide 5mg (Diabetes)', nameAr: 'جلينبينكلاميد 5 ملجم', genericName: 'Glibenclamide', brandName: 'Daonil', dosageForm: 'TABLET', strength: '5mg', categoryName: 'Diabetes Care', categoryNameAr: 'أدوية السكري', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'GB2401', barcode: '6282100000325', purchasePrice: 7.0, sellingPrice: 10.0, quantity: 220, expiryMonths: 24 },
  { sku: 'SUPP-GLUC', name: 'Glucose Powder 300g', nameAr: 'جلوكوز مسحوق 300 جم', genericName: 'Dextrose Monohydrate', brandName: 'Glucoplus', dosageForm: 'POWDER', strength: '300g', categoryName: 'Diabetes Care', categoryNameAr: 'أدوية السكري', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'GP240a', barcode: '6282100000332', purchasePrice: 6.0, sellingPrice: 9.0, quantity: 110, expiryMonths: 20 },
  { sku: 'TD-2-STRIP', name: 'Blood Glucose Test Strips (50)', nameAr: 'شرائح فحص السكر (50 شريحة)', genericName: 'Glucose Test Strips', brandName: 'OneTouch', dosageForm: 'SUPPOSITORY', strength: '50 strips', categoryName: 'Medical Supplies', categoryNameAr: 'المستلزمات الطبية', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'ST2401', barcode: '6282100000349', purchasePrice: 45.0, sellingPrice: 68.0, quantity: 60, expiryMonths: 24 },
  // --- Respiratory, Gastro, Cardio, Eye/Ear, Cough & Cold (10) ---
  { sku: 'SALB-100-1', name: 'Salbutamol 100mcg Inhaler', nameAr: 'سالبوتامول جهاز استنشاق', genericName: 'Salbutamol', brandName: 'Ventolin', dosageForm: 'INHALER', strength: '100mcg', categoryName: 'Respiratory', categoryNameAr: 'جهاز التنفس', manufacturerKey: 'GSK', manufacturerCountry: 'United Kingdom', batchNumber: 'SA2403', barcode: '6282100000356', purchasePrice: 24.0, sellingPrice: 35.0, quantity: 75, expiryMonths: 24 },
  { sku: 'PARACET-COLD', name: 'Tramadol 50mg (Analgesic - Restricted)', nameAr: 'ترامادول 50 ملجم', genericName: 'Tramadol', brandName: 'Tramal', dosageForm: 'CAPSULE', strength: '50mg', categoryName: 'Analgesics', categoryNameAr: 'مسكنات', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'TD2401', barcode: '6282100000363', purchasePrice: 9.0, sellingPrice: 13.0, quantity: 85, expiryMonths: 18 },
  { sku: 'PANT-40-14', name: 'Pantoprazole 40mg Tablets', nameAr: 'بانتوبرازول 40 ملجم', genericName: 'Pantoprazole', brandName: 'Controloc', dosageForm: 'TABLET', strength: '40mg', categoryName: 'Gastrointestinal', categoryNameAr: 'الجهاز الهضمي', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'PP2404', barcode: '6282100000370', purchasePrice: 15.0, sellingPrice: 22.0, quantity: 170, expiryMonths: 24 },
  { sku: 'DOM-10-20', name: 'Domperidone 10mg Tablets', nameAr: 'دومبيريدون 10 ملجم', genericName: 'Domperidone', brandName: 'Motilium', dosageForm: 'TABLET', strength: '10mg', categoryName: 'Gastrointestinal', categoryNameAr: 'الجهاز الهضمي', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'DO2402', barcode: '6282100000387', purchasePrice: 5.0, sellingPrice: 7.5, quantity: 200, expiryMonths: 22 },
  { sku: 'OMEP-20-caps', name: 'Omeprazole 20mg Capsules', nameAr: 'أوميبرازول 20 ملجم', genericName: 'Omeprazole', brandName: 'Losec', dosageForm: 'CAPSULE', strength: '20mg', categoryName: 'Gastrointestinal', categoryNameAr: 'الجهاز الهضمي', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'OM2406', barcode: '6282100000394', purchasePrice: 6.0, sellingPrice: 9.0, quantity: 230, expiryMonths: 24 },
  { sku: 'METO-10-30', name: 'Metoclopramide 10mg (Gastro)', nameAr: 'ميتوكلوبراميد 10 ملجم', genericName: 'Metoclopramide', brandName: 'Plasil', dosageForm: 'TABLET', strength: '10mg', categoryName: 'Gastrointestinal', categoryNameAr: 'الجهاز الهضمي', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'MC2407', barcode: '6282100000400', purchasePrice: 3.0, sellingPrice: 4.5, quantity: 190, expiryMonths: 18 },
  { sku: 'AMLOD-5-30', name: 'Amlodipine 5mg Tablets', nameAr: 'أملوديبين 5 ملجم', genericName: 'Amlodipine', brandName: 'Norvasc', dosageForm: 'TABLET', strength: '5mg', categoryName: 'Cardiovascular', categoryNameAr: 'القلب والأوعية الدموية', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'AM2401', barcode: '6282100000417', purchasePrice: 7.0, sellingPrice: 10.0, quantity: 210, expiryMonths: 24 },
  { sku: 'ATORVA-20-30', name: 'Atorvastatin 20mg Tablets', nameAr: 'أتورفاستاتين 20 ملجم', genericName: 'Atorvastatin', brandName: 'Lipitor', dosageForm: 'TABLET', strength: '20mg', categoryName: 'Cardiovascular', categoryNameAr: 'القلب والأوعية الدموية', manufacturerKey: 'Novartis', manufacturerCountry: 'Switzerland', batchNumber: 'AT2402', barcode: '6282100000424', purchasePrice: 14.0, sellingPrice: 21.0, quantity: 150, expiryMonths: 24 },
  { sku: 'CAPT-25-30', name: 'Captopril 25mg Tablets', nameAr: 'كابتوبريل 25 ملجم', genericName: 'Captopril', brandName: 'Capoten', dosageForm: 'TABLET', strength: '25mg', categoryName: 'Cardiovascular', categoryNameAr: 'القلب والأوعية الدموية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'CP2403', barcode: '6282100000431', purchasePrice: 5.0, sellingPrice: 8.0, quantity: 175, expiryMonths: 22 },
  { sku: 'CHLOR-0.5-EYE', name: 'Chloramphenicol 0.5% Eye Drops', nameAr: 'كلورامفينيكول قطرات عين', genericName: 'Chloramphenicol', brandName: 'Chlomy', dosageForm: 'DROPS', strength: '0.5%', categoryName: 'Eye & Ear Care', categoryNameAr: 'العناية بالعين والأذن', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'CH2405', barcode: '6282100000448', purchasePrice: 4.0, sellingPrice: 6.5, quantity: 120, expiryMonths: 18 },
  { sku: 'CETIR-10-20', name: 'Cetirizine 10mg Tablets', nameAr: 'سيتريزين 10 ملجم', genericName: 'Cetirizine', brandName: 'Zyrtec', dosageForm: 'TABLET', strength: '10mg', categoryName: 'Cough & Cold', categoryNameAr: 'السعال والزكام', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'CZ2401', barcode: '6282100000455', purchasePrice: 4.0, sellingPrice: 6.0, quantity: 260, expiryMonths: 24 },
  { sku: 'DEXO-15-SYR', name: 'Dextromethorphan 15mg Syrup', nameAr: 'ديكستروميثورفان شراب', genericName: 'Dextromethorphan', brandName: 'Tussin', dosageForm: 'SYRUP', strength: '15mg/5ml', categoryName: 'Cough & Cold', categoryNameAr: 'السعال والزكام', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'DX2402', barcode: '6282100000462', purchasePrice: 9.0, sellingPrice: 13.5, quantity: 130, expiryMonths: 18 },
  // --- First Aid & Medical Supplies (5) ---
  { sku: 'BAND-AID-ASSORT', name: 'Adhesive Bandages Assorted', nameAr: 'لاصقات جروح مشكّله', genericName: 'Bandage Strips', brandName: 'Leukoplast', dosageForm: 'PATCH', strength: 'Assorted 100', categoryName: 'First Aid', categoryNameAr: 'الإسعافات الأولية', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'BA2403', barcode: '6282100000479', purchasePrice: 8.0, sellingPrice: 12.0, quantity: 150, expiryMonths: 24 },
  { sku: 'GAUZE-ROLL-10', name: 'Sterile Gauze Roll 10cm', nameAr: 'شاش طبي معقم 10 سم', genericName: 'Gauze Roll', brandName: 'Nusil', dosageForm: 'PATCH', strength: '10cm x 9m', categoryName: 'First Aid', categoryNameAr: 'الإسعافات الأولية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'GS2404', barcode: '6282100000486', purchasePrice: 7.0, sellingPrice: 10.5, quantity: 145, expiryMonths: 36 },
  { sku: 'PARAC-NASE-SPRAY', name: 'Normal Saline Spray 100ml', nameAr: 'محلول ملحي بخاخ أنف', genericName: 'Sodium Chloride', brandName: 'Salinase', dosageForm: 'SPRAY', strength: '0.9% 100ml', categoryName: 'Medical Supplies', categoryNameAr: 'المستلزمات الطبية', manufacturerKey: 'Jamjoom Pharma', manufacturerCountry: 'Saudi Arabia', batchNumber: 'NS2402', barcode: '6282100000493', purchasePrice: 6.0, sellingPrice: 9.0, quantity: 140, expiryMonths: 24 },
  { sku: 'GLP-USE-4', name: 'Disposable Syringes 5ml (100)', nameAr: 'محاقن معقمة 5 مل (100)', genericName: 'Syringes', brandName: 'MediSafe', dosageForm: 'PATCH', strength: '5ml', categoryName: 'Medical Supplies', categoryNameAr: 'المستلزمات الطبية', manufacturerKey: 'SPIMACO', manufacturerCountry: 'Saudi Arabia', batchNumber: 'SY2401', barcode: '6282100000509', purchasePrice: 30.0, sellingPrice: 45.0, quantity: 45, expiryMonths: 36 },
  { sku: 'SURG-TAPE-1', name: 'Surgical Tape 2.5cm', nameAr: 'شريط لاصق طبي 2.5 سم', genericName: 'Surgical Tape', brandName: 'MICROPORE', dosageForm: 'PATCH', strength: '2.5cm x 9m', categoryName: 'First Aid', categoryNameAr: 'الإسعافات الأولية', manufacturerKey: 'Jessy', manufacturerCountry: 'USA', batchNumber: 'TP2405', barcode: '6282100000516', purchasePrice: 5.0, sellingPrice: 8.0, quantity: 160, expiryMonths: 36 },
  { sku: 'PARACET-STREP', name: 'Anti-bacterial Wipes (Pack 80)', nameAr: 'مناديل معقمة (80 منديل)', genericName: 'Antibacterial Wipes', brandName: 'Dettol', dosageForm: 'PATCH', strength: '80 wipes', categoryName: 'First Aid', categoryNameAr: 'الإسعافات الأولية', manufacturerKey: 'P&G', manufacturerCountry: 'USA', batchNumber: 'WB2403', barcode: '6282100000523', purchasePrice: 12.0, sellingPrice: 18.0, quantity: 120, expiryMonths: 24 },
];

async function seedGiantCatalog(): Promise<void> {
  let createdProducts = 0;
  let createdBatches = 0;

  for (const item of GIANT_CATALOG) {
    const existingProduct = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (existingProduct) continue;

    const categoryId = await ensureCategoryId(item.categoryName, item.categoryNameAr, 5);
    const manufacturerId = await ensureManufacturerId(item.manufacturerKey, item.manufacturerCountry);

    const product = await prisma.product.create({
      data: {
        name: item.name,
        nameAr: item.nameAr,
        genericName: item.genericName,
        brandName: item.brandName,
        dosageForm: item.dosageForm,
        strength: item.strength,
        categoryId,
        manufacturerId,
        barcode: item.barcode,
        sku: item.sku,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        minSellingPrice: Math.round(item.purchasePrice * 1.05 * 100) / 100,
        taxRate: 15,
        reorderLevel: 10,
        packageSize: item.strength,
      },
    });
    createdProducts++;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + (Number(item.expiryMonths) > 0 ? Number(item.expiryMonths) : 24));

    await prisma.batch.create({
      data: {
        productId: product.id,
        batchNumber: item.batchNumber,
        expiryDate,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        quantity: item.quantity,
        remainingQuantity: item.quantity,
      },
    });
    createdBatches++;
  }

  console.log(`giant catalog: created ${createdProducts} products and ${createdBatches} batches (existing kept untouched)`);
}

async function main(): Promise<void> {
  await seedPermissions();
  await seedRoles();
  await seedAdmin();
  await seedPharmacy();
  await seedSettings();
  await seedDemoData();
  await seedExtraCategories();
  await seedStaffAccountsAndCatalog();
  await seedSuppliersAndCustomers();
  await seedGiantCatalog();
  console.log('Seed completed successfully');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });