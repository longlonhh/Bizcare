// Nhãn tiếng Việt và tông màu cho các trạng thái dùng chung.

export const roleLabels = {
  admin: "Admin (Chủ DN)",
  accountant: "Kế toán viên",
  warehouse: "Thủ kho",
  hr: "Quản lý nhân sự",
};

export const userStatusLabels = {
  active: "Hoạt động",
  inactive: "Chưa kích hoạt",
  deactivated: "Tạm khóa",
};

export const purchaseOrderStatus = {
  draft: { label: "Nháp", tone: "muted" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  received: { label: "Đã nhập kho", tone: "success" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
};

export const salesOrderStatus = {
  draft: { label: "Nháp", tone: "muted" },
  confirmed: { label: "Đã xác nhận", tone: "info" },
  completed: { label: "Đã xuất kho", tone: "success" },
  cancelled: { label: "Đã huỷ", tone: "danger" },
};

export const invoiceTypeLabels = {
  retail: "Bán lẻ",
  einvoice: "Điện tử VAT",
};

export const invoiceStatusLabels = {
  draft: "Chưa phát hành",
  issued: "Đã phát hành",
  cancelled: "Đã huỷ",
};

/** Nhãn + tông màu cho một bản ghi lịch sử kho. */
export const inventoryLogType = {
  import: { label: "Nhập kho", tone: "success" },
  export: { label: "Xuất kho", tone: "info" },
  adjustment: { label: "Điều chỉnh kiểm kê", tone: "gold" },
};

export const referenceTypeLabels = {
  purchase_order: "Phiếu nhập",
  sales_order: "Phiếu xuất",
  manual_adjustment: "Kiểm kê thủ công",
};

export const attendanceStatus = {
  present: { label: "Đủ ca", tone: "success" },
  late: { label: "Đi muộn", tone: "warning" },
  half_day: { label: "Nửa ca", tone: "info" },
  leave: { label: "Nghỉ phép", tone: "muted" },
  absent: { label: "Không phép", tone: "danger" },
};

export const salaryTypeLabels = {
  monthly: "Theo tháng",
  hourly: "Theo giờ",
};

export const employeeStatusLabels = {
  active: "Đang làm",
  inactive: "Đã nghỉ việc",
};

export const taxTypeLabels = {
  vat_output: "GTGT đầu ra",
  vat_input: "GTGT đầu vào",
  vat_payable: "GTGT phải nộp",
  cit: "TNDN",
  pit: "TNCN",
  business_license: "Môn bài",
  khoan_tax_revenue: "Thuế khoán",
};

export const periodTypeLabels = {
  monthly: "Theo tháng",
  quarterly: "Theo quý",
  yearly: "Theo năm",
};

/** Mô tả kỳ kê khai từ bản ghi thuế. */
export const taxPeriodLabel = (record) => {
  if (record.periodType === "monthly") return `Tháng ${record.month}/${record.year}`;
  if (record.periodType === "quarterly") return `Quý ${record.quarter}/${record.year}`;
  return `Năm ${record.year}`;
};

/** Vai trò nào được xem phân hệ nào (dùng để ẩn menu không có quyền). */
export const navPermissions = {
  "/": ["admin", "accountant", "warehouse", "hr"],
  "/products": ["admin", "warehouse"],
  "/inventory": ["admin", "warehouse", "accountant"],
  "/purchase-orders": ["admin", "warehouse"],
  "/sales-orders": ["admin", "warehouse"],
  "/suppliers": ["admin"],
  "/customers": ["admin", "accountant"],
  "/invoices": ["admin", "accountant"],
  "/tax": ["admin", "accountant"],
  "/reports": ["admin", "accountant"],
  "/employees": ["admin", "hr"],
  "/attendance": ["admin", "hr"],
  "/salary": ["admin", "hr"],
  "/users": ["admin"],
};
