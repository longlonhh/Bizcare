import { useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users2,
} from "lucide-react";

import {
  DataTable,
  EmptyRow,
  ErrorBlock,
  Field,
  LoadingBlock,
  Notice,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  Td,
} from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { authApi, rolesApi } from "@/lib/api";
import { dateTimeVN } from "@/lib/format";
import { roleLabels, userStatusLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  username: "",
  password: "",
  fullName: "",
  phone: "",
  email: "",
  role: "accountant",
};

// Nhãn tiếng Việt cho từng khoá quyền trong dữ liệu vai trò
const FEATURE_LABELS = {
  products: "Sản phẩm & Danh mục",
  inventory: "Tồn kho & Kiểm kho",
  "purchase-orders": "Phiếu nhập hàng (PO)",
  "sales-orders": "Phiếu xuất hàng (SO)",
  customers: "Khách hàng (CRM)",
  invoices: "Hóa đơn & VietQR",
  tax: "Động cơ thuế & XML",
  reports: "Báo cáo tài chính P&L",
  employees: "Hồ sơ nhân viên",
  attendance: "Chấm công hàng ngày",
  salaries: "Tính & chốt bảng lương",
  users: "Tài khoản & Phân quyền",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // State đổi mật khẩu của chính người dùng đang đăng nhập
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // State xem mật khẩu dành cho Admin
  const [revealTarget, setRevealTarget] = useState(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [revealedData, setRevealedData] = useState(null);
  const [revealError, setRevealError] = useState("");
  const [copied, setCopied] = useState(false);

  const users = useResource(() => authApi.getUsers(), []);
  const roles = useResource(() => rolesApi.getAll(), []);

  const rows = users.data || [];
  const roleList = roles.data || [];

  const stats = useMemo(() => {
    const countByRole = (roleName) => rows.filter((u) => u.role?.name === roleName).length;
    return {
      admin: countByRole("admin"),
      accountant: countByRole("accountant"),
      warehouse: countByRole("warehouse"),
      active: rows.filter((u) => u.status === "active").length,
    };
  }, [rows]);

  // Ma trận phân quyền dựng trực tiếp từ dữ liệu vai trò trong database
  const matrix = useMemo(() => {
    const features = Object.keys(FEATURE_LABELS);
    return features.map((feature) => ({
      feature,
      label: FEATURE_LABELS[feature],
      grants: roleList.map((role) => {
        const permissions = role.permissions || [];
        return permissions.includes("*") || permissions.includes(feature);
      }),
    }));
  }, [roleList]);

  const handleOpenReveal = (account) => {
    setRevealTarget(account);
    setAdminPasswordInput("");
    setRevealedData(null);
    setRevealError("");
    setCopied(false);
  };

  const handleConfirmReveal = async (e) => {
    e.preventDefault();
    if (!adminPasswordInput) return;
    setRevealing(true);
    setRevealError("");
    try {
      const res = await authApi.revealPassword(revealTarget.id, adminPasswordInput);
      setRevealedData(res);
    } catch (err) {
      setRevealError(err.message || "Mật khẩu quản trị viên không chính xác");
    } finally {
      setRevealing(false);
    }
  };

  const handleCopyPassword = () => {
    if (revealedData?.password) {
      navigator.clipboard.writeText(revealedData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError("Mật khẩu nhập lại không khớp");
      return;
    }
    setPwdSaving(true);
    setPwdError("");
    try {
      await authApi.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdOpen(false);
      setNotice({ tone: "success", message: "Đổi mật khẩu thành công" });
    } catch (err) {
      setPwdError(err.message || "Đổi mật khẩu thất bại");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      await authApi.createUser({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", message: "Đã tạo tài khoản mới" });
      users.reload();
    } catch (err) {
      // Hiện lỗi ngay trong hộp thoại thêm tài khoản để người dùng thấy liền
      setFormError(err.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (account) => {
    setBusyId(account.id);
    setNotice(null);
    try {
      const result = await authApi.deactivateUser(account.id);
      setNotice({ tone: "success", message: result.message });
      users.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (account) => {
    setBusyId(account.id);
    setNotice(null);
    try {
      const result = await authApi.deleteUser(account.id);
      setNotice({ tone: "success", message: result.message });
      users.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Phân quyền & Quản trị Users"
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setPwdError("");
                setPwdOpen(true);
              }}
            >
              <KeyRound className="size-4" /> Đổi mật khẩu
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setForm(EMPTY_FORM);
                setFormError("");
                setOpen(true);
              }}
            >
              <UserPlus className="size-4" /> Thêm tài khoản
            </Button>
          </div>
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Tài khoản Admin"
          value={stats.admin}
          currency={false}
          unit="user"
          icon={<ShieldCheck className="size-4" />}
        />
        <StatCard
          label="Tài khoản Kế toán"
          value={stats.accountant}
          currency={false}
          unit="user"
          icon={<CheckCircle2 className="size-4" />}
        />
        <StatCard
          label="Tài khoản Thủ kho"
          value={stats.warehouse}
          currency={false}
          unit="user"
          icon={<Users2 className="size-4" />}
        />
        <StatCard label="Đang kích hoạt" value={stats.active} currency={false} unit="user" />
      </div>

      <Panel className="mt-5" title="Danh sách tài khoản người dùng" bodyClassName="p-0">
        {users.loading ? (
          <LoadingBlock />
        ) : users.error ? (
          <ErrorBlock message={users.error} onRetry={users.reload} />
        ) : (
          <DataTable
            head={[
              "Tài khoản",
              "Họ & Tên",
              "Vai trò",
              "Bảo mật & Mật khẩu",
              "Ngày tạo",
              "Trạng thái",
              "Thao tác",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow colSpan={7} message="Chưa có tài khoản nào" />
            ) : (
              rows.map((account) => (
                <tr key={account.id} className="hover:bg-muted/50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-bold text-primary">
                        {account.username.charAt(0).toUpperCase()}
                      </span>
                      <p className="font-mono text-sm font-semibold">{account.username}</p>
                    </div>
                  </Td>
                  <Td className="font-medium">{account.fullName}</Td>
                  <Td>
                    <Pill
                      tone={
                        account.role?.name === "admin"
                          ? "gold"
                          : account.role?.name === "accountant"
                            ? "info"
                            : account.role?.name === "warehouse"
                              ? "success"
                              : "primary"
                      }
                    >
                      {roleLabels[account.role?.name] || "—"}
                    </Pill>
                  </Td>
                  <Td>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleOpenReveal(account)}
                    >
                      <Eye className="size-3.5" />
                      Xem mật khẩu
                    </Button>
                  </Td>
                  <Td className="text-xs text-muted-foreground">{dateTimeVN(account.createdAt)}</Td>
                  <Td>
                    <Pill tone={account.status === "active" ? "success" : "danger"}>
                      {userStatusLabels[account.status] || account.status}
                    </Pill>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === account.id || account.id === currentUser?.id}
                        onClick={() => handleToggle(account)}
                      >
                        {busyId === account.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : null}
                        {account.status === "active" ? "Khoá" : "Mở khoá"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Xoá tài khoản"
                        disabled={busyId === account.id || account.id === currentUser?.id}
                        onClick={() => handleDelete(account)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </Panel>

      <Panel
        className="mt-5"
        title="Ma trận phân quyền RBAC"
        bodyClassName="p-0"
      >
        {roles.loading ? (
          <LoadingBlock />
        ) : (
          <DataTable head={[ ...roleList.map((r) => roleLabels[r.name] || r.name)]}>
            {matrix.map((row) => (
              <tr key={row.feature} className="hover:bg-muted/50">
                <Td className="font-medium">{row.label}</Td>
                {row.grants.map((granted, index) => (
                  <Td key={index}>
                    <Pill tone={granted ? "success" : "muted"}>
                      {granted ? "Toàn quyền" : "Không"}
                    </Pill>
                  </Td>
                ))}
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) setFormError("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm tài khoản nhân viên</DialogTitle>
            <DialogDescription>
              Chỉ cấm trùng tên đăng nhập và mật khẩu — SĐT/email có thể bỏ trống hoặc trùng.
            </DialogDescription>
          </DialogHeader>

          {formError ? (
            <Notice tone="error" message={formError} onClose={() => setFormError("")} />
          ) : null}

          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên đăng nhập">
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="ketoan02"
                required
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
                required
              />
            </Field>
            <Field label="Họ và tên" className="sm:col-span-2">
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Nguyễn Thị Kế Toán"
                required
              />
            </Field>
            <Field label="Số điện thoại (không bắt buộc)">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0901111111"
              />
            </Field>
            <Field label="Email (không bắt buộc)">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ketoan@bizcare.vn"
              />
            </Field>
            <Field label="Vai trò phân quyền" className="sm:col-span-2">
              <select
                className="field"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                {saving ? "Đang lưu…" : "Tạo tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại đổi mật khẩu của chính người dùng đang đăng nhập */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-6" />
            </div>
            <DialogTitle className="text-center font-display text-lg">
              Đổi mật khẩu của bạn
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Mật khẩu được băm một chiều (bcrypt). Nhập đúng mật khẩu hiện tại để đổi sang mật khẩu mới.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="mt-2 space-y-4">
            {pwdError ? <Notice tone="error">{pwdError}</Notice> : null}
            <Field label="Mật khẩu hiện tại">
              <Input
                type="password"
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                autoFocus
                required
              />
            </Field>
            <Field label="Mật khẩu mới">
              <Input
                type="password"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                placeholder="Tối thiểu 6 ký tự"
                minLength={6}
                required
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <Input
                type="password"
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                minLength={6}
                required
              />
            </Field>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={pwdSaving}>
                {pwdSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Đổi mật khẩu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hộp thoại xem mật khẩu nhân viên (chỉ dành cho Admin) */}
      <Dialog
        open={Boolean(revealTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setRevealTarget(null);
            setRevealedData(null);
            setAdminPasswordInput("");
            setRevealError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <LockKeyhole className="size-6" />
            </div>
            <DialogTitle className="text-center font-display text-lg">
              {revealedData ? "Mật khẩu tài khoản" : "Xác thực quyền Quản trị"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {revealedData
                ? `Mật khẩu đăng nhập của tài khoản ${revealedData.username}`
                : `Để xem mật khẩu của ${revealTarget?.fullName} (@${revealTarget?.username}), vui lòng nhập mật khẩu tài khoản Admin của bạn.`}
            </DialogDescription>
          </DialogHeader>

          {revealedData ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground">Tài khoản</p>
                <p className="font-mono text-sm font-semibold">{revealedData.username}</p>

                <p className="mt-3 text-xs text-muted-foreground">Mật khẩu hiện tại</p>
                <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
                  <span className="font-mono text-base font-bold tracking-wider text-primary select-all">
                    {revealedData.password}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={handleCopyPassword}
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-success" />
                        <span className="text-success font-semibold">Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    setRevealTarget(null);
                    setRevealedData(null);
                  }}
                >
                  Đóng
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleConfirmReveal} className="mt-2 space-y-4">
              {revealError ? <Notice tone="error">{revealError}</Notice> : null}
              <Field label="Mật khẩu Admin của bạn">
                <Input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu admin..."
                  autoFocus
                  required
                />
              </Field>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRevealTarget(null)}
                >
                  Huỷ
                </Button>
                <Button type="submit" disabled={revealing || !adminPasswordInput}>
                  {revealing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Xác nhận & Xem mật khẩu
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
