import { Navigate, Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { navPermissions } from "@/lib/labels";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import InventoryPage from "@/pages/inventory";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import SalesOrdersPage from "@/pages/sales-orders";
import SuppliersPage from "@/pages/suppliers";
import CustomersPage from "@/pages/customers";
import InvoicesPage from "@/pages/invoices";
import TaxPage from "@/pages/tax";
import ReportsPage from "@/pages/reports";
import EmployeesPage from "@/pages/employees";
import AttendancePage from "@/pages/attendance";
import SalaryPage from "@/pages/salary";
import UsersPage from "@/pages/users";

/** Chặn khi chưa đăng nhập; hiện thông báo khi thiếu quyền. */
function ProtectedLayout() {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = navPermissions[location.pathname];
  if (allowed && !allowed.includes(role)) {
    return (
      <AppShell>
        <div className="surface-card mx-auto mt-10 max-w-lg p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-6" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold">Không có quyền truy cập</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Vai trò hiện tại của bạn không được phép mở phân hệ này. Liên hệ Admin nếu cần cấp
            quyền.
          </p>
        </div>
      </AppShell>
    );
  }

  return <AppShell />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-6xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được di chuyển.
        </p>
        <Button className="mt-6" asChild>
          <a href="/">Về bảng điều khiển</a>
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="/sales-orders" element={<SalesOrdersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/salary" element={<SalaryPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}
