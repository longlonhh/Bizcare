// Các tập giá trị dùng chung toàn hệ thống (trước đây là enum TypeORM).

const RoleName = {
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  WAREHOUSE: 'warehouse',
  HR: 'hr',
};

const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DEACTIVATED: 'deactivated',
};

const ProductStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const InventoryLogType = {
  IMPORT: 'import',
  EXPORT: 'export',
  ADJUSTMENT: 'adjustment',
};

const PurchaseOrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

const PaymentStatus = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
};

const SalesOrderStatus = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const SalesPaymentStatus = {
  UNPAID: 'unpaid',
  PAID: 'paid',
};

const InvoiceType = {
  RETAIL: 'retail',
  EINVOICE: 'einvoice',
};

const InvoiceStatus = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  CANCELLED: 'cancelled',
};

const TaxType = {
  VAT_OUTPUT: 'vat_output',
  VAT_INPUT: 'vat_input',
  VAT_PAYABLE: 'vat_payable',
  CIT: 'cit',
  PIT: 'pit',
  BUSINESS_LICENSE: 'business_license',
  KHOAN_TAX_REVENUE: 'khoan_tax_revenue',
};

const TaxPeriodType = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

const SalaryType = {
  MONTHLY: 'monthly',
  HOURLY: 'hourly',
};

const EmployeeStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LEAVE: 'leave',
  LATE: 'late',
  HALF_DAY: 'half_day',
};

const values = (obj) => Object.values(obj);

module.exports = {
  RoleName,
  UserStatus,
  ProductStatus,
  InventoryLogType,
  PurchaseOrderStatus,
  PaymentStatus,
  SalesOrderStatus,
  SalesPaymentStatus,
  InvoiceType,
  InvoiceStatus,
  TaxType,
  TaxPeriodType,
  SalaryType,
  EmployeeStatus,
  AttendanceStatus,
  values,
};
