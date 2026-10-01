import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, LogIn, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const DEMO_ACCOUNTS = [
  ["admin", "admin123", "Admin / Chủ doanh nghiệp"],
  ["ketoan01", "ketoan123", "Kế toán"],
  ["kho01", "kho123", "Thủ kho"],
  ["nhanvien01", "ns123", "Nhân sự"],
];

/**
 * Chỉ nhận đường dẫn nội bộ (bắt đầu bằng một dấu "/") để tránh bị lợi dụng
 * chuyển hướng ra trang ngoài sau khi đăng nhập (open redirect).
 */
function safeRedirect(from) {
  if (typeof from !== "string") return "/";
  if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return "/";
  return from;
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) return <Navigate to={safeRedirect(location.state?.from)} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate(safeRedirect(location.state?.from), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-raised)] lg:grid lg:grid-cols-2">
        {/* Cột giới thiệu */}
        <div className="relative hidden flex-col justify-between gradient-indigo p-10 text-primary-foreground lg:flex">
          <div>
            <div className="grid size-12 place-items-center rounded-2xl bg-white/20 shadow-inner backdrop-blur-sm font-display text-xl font-bold text-white">
              B
            </div>
            <h1 className="mt-8 font-display text-3xl font-bold leading-tight">BizCare ERP</h1>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/80">
              Hệ thống quản lý doanh thu, kho vận và tính thuế dành cho doanh nghiệp SMEs và hộ kinh
              doanh Việt Nam.
            </p>
          </div>

          <ul className="mt-10 space-y-3 text-sm">
            {[
              "Nhập – xuất kho tự động cập nhật giá vốn bình quân",
              "Động cơ tính thuế GTGT, TNDN và thuế khoán chuẩn",
              "Báo cáo P&L phân tích dòng tiền và COGS tự động",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <KeyRound className="size-3.5" />
                </div>
                <span className="text-primary-foreground/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột đăng nhập */}
        <div className="p-8 sm:p-10">
          <h2 className="font-display text-2xl font-bold">Đăng nhập hệ thống</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập tài khoản được cấp bởi quản trị viên doanh nghiệp.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="username">Tên đăng nhập</Label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative mt-1.5">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pl-9 pr-11"
                  required
                />
                {/* Nút hiện / ẩn mật khẩu */}
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tài khoản demo
            </p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {DEMO_ACCOUNTS.map(([user, pass, label]) => (
                <li key={user} className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="font-mono font-semibold text-primary hover:underline"
                    onClick={() => {
                      setUsername(user);
                      setPassword(pass);
                      setError("");
                    }}
                  >
                    {user} / {pass}
                  </button>
                  <span className="text-muted-foreground">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
