import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ArrowDownToLine,
  ArrowUpFromLine,
  IdCard,
  Landmark,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Moon,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Sun,
  Truck,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { navPermissions, roleLabels } from "@/lib/labels";
import { inventoryApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    title: "Tổng quan",
    items: [{ to: "/", label: "Bảng điều khiển", icon: LayoutDashboard }],
  },
  {
    title: "Bán hàng & Kho",
    items: [
      { to: "/products", label: "Sản phẩm", icon: Package },
      { to: "/inventory", label: "Tồn kho", icon: Warehouse, badge: "lowStock" },
      { to: "/purchase-orders", label: "Phiếu nhập hàng", icon: ArrowDown },
      { to: "/sales-orders", label: "Phiếu xuất hàng", icon: ArrowUp },
      { to: "/suppliers", label: "Nhà cung cấp", icon: Truck },
      { to: "/customers", label: "Khách hàng", icon: Users },
    ],
  },
  {
    title: "Tài chính & Thuế",
    items: [
      { to: "/invoices", label: "Hóa đơn & VietQR", icon: ReceiptText },
      { to: "/tax", label: "Động cơ tính thuế", icon: Landmark },
      { to: "/reports", label: "Báo cáo P&L", icon: LineChart },
    ],
  },
  {
    title: "Nhân sự & Quản trị",
    items: [
      { to: "/employees", label: "Hồ sơ nhân viên", icon: IdCard },
      { to: "/attendance", label: "Nhật ký chấm công", icon: CalendarClock },
      { to: "/salary", label: "Bảng lương", icon: Wallet },
      { to: "/users", label: "Phân quyền & Users", icon: ShieldCheck },
    ],
  },
];

/** Kỳ kê khai hiện tại và hạn nộp theo quy định (ngày cuối tháng kế tiếp quý). */
function currentTaxPeriod(today = new Date()) {
  const quarter = Math.floor(today.getMonth() / 3) + 1;
  const year = today.getFullYear();
  const deadlineMonth = quarter * 3 + 1; // tháng kế tiếp sau quý
  const deadline = new Date(year, deadlineMonth, 0); // ngày cuối tháng đó
  return {
    label: `Quý ${["I", "II", "III", "IV"][quarter - 1]} / ${year}`,
    deadline: deadline.toLocaleDateString("vi-VN"),
  };
}

function SidebarNav({ lowStockCount, onNavigate }) {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const taxPeriod = useMemo(() => currentTaxPeriod(), []);

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="grid size-10 place-items-center rounded-xl shadow-card font-display text-lg font-bold text-primary-foreground gradient-indigo">
          B
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-semibold leading-tight tracking-tight">BizCare</p>
          <p className="truncate text-xs text-sidebar-foreground/50 font-medium">Enterprise ERP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => {
          const visible = group.items.filter((item) =>
            (navPermissions[item.to] || []).includes(role),
          );
          if (visible.length === 0) return null;

          return (
            <div key={group.title} className="pb-4">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group.title}
              </p>
              <ul className="space-y-1">
                {visible.map((item) => {
                  const active = pathname === item.to;
                  const badge = item.badge === "lowStock" ? lowStockCount : null;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                        )}
                      >
                        <item.icon className={cn("size-4 shrink-0 transition-colors", active && "text-sidebar-primary")} />
                        <span className="truncate">{item.label}</span>
                        {badge > 0 ? (
                          <span className="ml-auto flex items-center gap-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            <span className="size-1.5 rounded-full bg-destructive-foreground shadow-[0_0_6px_0_currentColor]" />
                            {badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-sidebar-accent/40 p-3 border border-sidebar-border/50">
          <p className="text-xs text-sidebar-foreground/50">Kỳ kê khai hiện tại</p>
          <p className="font-display text-sm font-semibold">{taxPeriod.label}</p>
          <p className="mt-1 text-[11px] text-sidebar-primary flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-sidebar-primary shadow-[0_0_4px_0_currentColor]" />
            Hạn nộp: {taxPeriod.deadline}
          </p>
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}

/**
 * Khung giao diện chính. Mặc định render trang con qua <Outlet />;
 * truyền `children` để thay bằng nội dung khác (ví dụ thẻ báo thiếu quyền).
 */
export function AppShell({ children }) {
  const [open, setOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const { user, role, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  // Số mặt hàng dưới định mức — hiển thị trên huy hiệu menu Tồn kho.
  useEffect(() => {
    if (!hasRole("admin", "warehouse", "accountant")) return;
    inventoryApi
      .getLowStock()
      .then((data) => setLowStockCount(data.count || 0))
      .catch(() => setLowStockCount(0));
  }, [hasRole]);

  const initials = useMemo(() => {
    const parts = String(user?.fullName || user?.username || "?").trim().split(/\s+/);
    return parts
      .slice(-2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <SidebarNav lowStockCount={lowStockCount} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Đóng menu"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <SidebarNav lowStockCount={lowStockCount} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Mở menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>

            <div className="hidden sm:flex h-9 flex-1 items-center justify-center rounded-lg border border-border bg-background/50 px-3 text-sm text-muted-foreground">
              <Search className="mr-2 size-4 opacity-50" />
              <input
                type="search"
                placeholder="Tìm kiếm..."
                className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <p className="hidden font-display text-sm font-semibold text-muted-foreground sm:block">
              Công ty TNHH Thương mại BizCare
            </p>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <div className="flex items-center gap-3 border-l border-border pl-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold leading-tight">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabels[role] || "Người dùng"}
                  </p>
                </div>
                <div className="grid size-9 place-items-center rounded-full shadow-sm font-semibold text-primary-foreground gradient-indigo">
                  {initials}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Đăng xuất"
                  title="Đăng xuất"
                >
                  <LogOut className="size-5" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
