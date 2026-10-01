import axios from "axios";

export const TOKEN_KEY = "bizcare_token";
export const USER_KEY = "bizcare_user";

const api = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Chuẩn hoá lỗi và tự đăng xuất khi token hết hạn
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginCall = String(error.config?.url || "").includes("/auth/login");

    if (status === 401 && !isLoginCall) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }

    const raw = error.response?.data?.message ?? error.message;
    const message = Array.isArray(raw) ? raw.join(", ") : String(raw || "Có lỗi xảy ra");
    return Promise.reject(Object.assign(new Error(message), { status }));
  },
);

/** Chỉ lấy phần `data` của phản hồi axios. */
export const pick = (promise) => promise.then((res) => res.data);

export default api;

// ============ AUTH ============
export const authApi = {
  register: (data) => pick(api.post("/auth/register", data)),
  login: (data) => pick(api.post("/auth/login", data)),
  requestOtp: (data) => pick(api.post("/auth/request-otp", data)),
  resetPassword: (data) => pick(api.post("/auth/reset-password", data)),
  getUsers: () => pick(api.get("/auth/users")),
  createUser: (data) => pick(api.post("/auth/users", data)),
  updateUser: (id, data) => pick(api.post(`/auth/users/${id}/update`, data)),
  deactivateUser: (id) => pick(api.post(`/auth/users/${id}/deactivate`)),
  deleteUser: (id) => pick(api.post(`/auth/users/${id}/delete`)),
  /** Admin xem mật khẩu nhân viên sau khi xác thực mật khẩu Admin. */
  revealPassword: (id, adminPassword) =>
    pick(api.post(`/auth/users/${id}/reveal-password`, { adminPassword })),
  /** Người dùng tự đổi mật khẩu của chính mình. */
  changePassword: (data) => pick(api.post("/auth/change-password", data)),
};

// ============ ROLES ============
export const rolesApi = {
  getAll: () => pick(api.get("/roles")),
};

// ============ PRODUCTS ============
export const productsApi = {
  getAll: (params) => pick(api.get("/products", { params })),
  getOne: (id) => pick(api.get(`/products/${id}`)),
  create: (data) => pick(api.post("/products", data)),
  update: (id, data) => pick(api.put(`/products/${id}`, data)),
  remove: (id) => pick(api.delete(`/products/${id}`)),
};

// ============ SUPPLIERS ============
export const suppliersApi = {
  getAll: (params) => pick(api.get("/suppliers", { params })),
  create: (data) => pick(api.post("/suppliers", data)),
  update: (id, data) => pick(api.put(`/suppliers/${id}`, data)),
  remove: (id) => pick(api.delete(`/suppliers/${id}`)),
};

// ============ CUSTOMERS ============
export const customersApi = {
  getAll: (params) => pick(api.get("/customers", { params })),
  create: (data) => pick(api.post("/customers", data)),
  update: (id, data) => pick(api.put(`/customers/${id}`, data)),
  remove: (id) => pick(api.delete(`/customers/${id}`)),
};

// ============ PURCHASE ORDERS ============
export const purchaseOrdersApi = {
  getAll: (params) => pick(api.get("/purchase-orders", { params })),
  getOne: (id) => pick(api.get(`/purchase-orders/${id}`)),
  create: (data) => pick(api.post("/purchase-orders", data)),
  /** Xác nhận nhập kho: cộng tồn và ghi lịch sử kho. */
  confirm: (id) => pick(api.post(`/purchase-orders/${id}/confirm`)),
  update: (id, data) => pick(api.put(`/purchase-orders/${id}`, data)),
  remove: (id) => pick(api.delete(`/purchase-orders/${id}`)),
};

// ============ SALES ORDERS ============
export const salesOrdersApi = {
  getAll: (params) => pick(api.get("/sales-orders", { params })),
  getOne: (id) => pick(api.get(`/sales-orders/${id}`)),
  create: (data) => pick(api.post("/sales-orders", data)),
  /** Xác nhận xuất kho: trừ tồn và ghi lịch sử kho. */
  confirm: (id) => pick(api.post(`/sales-orders/${id}/confirm`)),
  update: (id, data) => pick(api.put(`/sales-orders/${id}`, data)),
  remove: (id) => pick(api.delete(`/sales-orders/${id}`)),
};

// ============ INVENTORY ============
export const inventoryApi = {
  getSummary: () => pick(api.get("/inventory/summary")),
  /** Lịch sử xuất nhập kho toàn hệ thống — dữ liệu thật từ mọi thao tác. */
  getLogs: (params) => pick(api.get("/inventory/logs", { params })),
  getProductLogs: (productId, params) => pick(api.get(`/inventory/logs/${productId}`, { params })),
  adjust: (data) => pick(api.post("/inventory/adjust", data)),
  getLowStock: () => pick(api.get("/inventory/low-stock")),
};

// ============ INVOICES ============
export const invoicesApi = {
  getAll: (params) => pick(api.get("/invoices", { params })),
  getOne: (id) => pick(api.get(`/invoices/${id}`)),
  createFromOrder: (salesOrderId, type) =>
    pick(api.post(`/invoices/create-from-order/${salesOrderId}`, null, { params: { type } })),
  issue: (id) => pick(api.post(`/invoices/${id}/issue`)),
  getVietQR: (id) => pick(api.get(`/invoices/${id}/vietqr`)),
  remove: (id) => pick(api.delete(`/invoices/${id}`)),
};

// ============ TAX ============
export const taxApi = {
  calculateHousehold: (data) => pick(api.post("/tax/household", data)),
  calculateVat: (data) => pick(api.post("/tax/vat", data)),
  calculateCit: (data) => pick(api.post("/tax/cit", data)),
  getRecords: (params) => pick(api.get("/tax/records", { params })),
  exportXml: (data) => pick(api.post("/tax/export-xml", data)),
};

// ============ REPORTS ============
export const reportsApi = {
  getPnl: (params) => pick(api.get("/reports/pnl", { params })),
  getDashboard: () => pick(api.get("/reports/dashboard")),
};

// ============ EMPLOYEES ============
export const employeesApi = {
  getAll: (params) => pick(api.get("/employees", { params })),
  create: (data) => pick(api.post("/employees", data)),
  update: (id, data) => pick(api.put(`/employees/${id}`, data)),
  remove: (id) => pick(api.delete(`/employees/${id}`)),
};

// ============ ATTENDANCE ============
export const attendanceApi = {
  getAll: (params) => pick(api.get("/attendance", { params })),
  create: (data) => pick(api.post("/attendance", data)),
  getSummary: (params) => pick(api.get("/attendance/summary", { params })),
  remove: (id) => pick(api.delete(`/attendance/${id}`)),
};

// ============ SALARIES ============
export const salariesApi = {
  getAll: (params) => pick(api.get("/salaries", { params })),
  calculate: (data) => pick(api.post("/salaries/calculate", data)),
  calculateAll: (data) => pick(api.post("/salaries/calculate-all", data)),
  remove: (id) => pick(api.delete(`/salaries/${id}`)),
};
