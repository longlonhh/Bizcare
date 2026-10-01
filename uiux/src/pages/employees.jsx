import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

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
import { employeesApi } from "@/lib/api";
import { dateVN, vnd } from "@/lib/format";
import { employeeStatusLabels, salaryTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  position: "",
  salaryType: "monthly",
  monthlySalary: "",
  hourlyRate: "",
  workingHoursPerDay: "8",
  startDate: "",
  notes: "",
};

export default function EmployeesPage() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const employees = useResource(() => employeesApi.getAll(), []);
  const rows = employees.data || [];

  const stats = useMemo(() => {
    const active = rows.filter((e) => e.status === "active");
    const monthlyCost = active
      .filter((e) => e.salaryType === "monthly")
      .reduce((sum, e) => sum + (e.monthlySalary || 0), 0);
    const hourlyCount = active.filter((e) => e.salaryType === "hourly").length;
    return { activeCount: active.length, monthlyCost, hourlyCount };
  }, [rows]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await employeesApi.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        position: form.position.trim(),
        salaryType: form.salaryType,
        monthlySalary: Number(form.monthlySalary) || 0,
        hourlyRate: Number(form.hourlyRate) || 0,
        workingHoursPerDay: Number(form.workingHoursPerDay) || 8,
        startDate: form.startDate || undefined,
        notes: form.notes.trim(),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", message: "Đã thêm nhân viên mới" });
      employees.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (employee) => {
    setBusyId(employee.id);
    setNotice(null);
    try {
      const nextStatus = employee.status === "active" ? "inactive" : "active";
      await employeesApi.update(employee.id, { status: nextStatus });
      setNotice({
        tone: "success",
        message:
          nextStatus === "active"
            ? `Đã kích hoạt lại ${employee.name}`
            : `Đã đánh dấu ${employee.name} đã nghỉ việc`,
      });
      employees.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (employee) => {
    setBusyId(employee.id);
    setNotice(null);
    try {
      await employeesApi.remove(employee.id);
      setNotice({ tone: "success", message: `Đã xoá nhân viên ${employee.name}` });
      employees.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Hồ sơ nhân viên"
        actions={
          hasRole("admin", "hr") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus className="size-4" /> Thêm nhân viên
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Nhân sự đang làm việc"
          value={stats.activeCount}
          currency={false}
          unit="người"
        />
        <StatCard label="Quỹ lương cứng hàng tháng" value={stats.monthlyCost} />
        <StatCard
          label="Nhân sự lương theo giờ"
          value={stats.hourlyCount}
          currency={false}
          unit="người"
        />
      </div>

      <Panel className="mt-5" title="Danh sách nhân sự" bodyClassName="p-0">
        {employees.loading ? (
          <LoadingBlock />
        ) : employees.error ? (
          <ErrorBlock message={employees.error} onRetry={employees.reload} />
        ) : (
          <DataTable
            head={[
              "Mã NV",
              "Họ tên",
              "Chức vụ",
              "Liên hệ",
              "Ngày vào làm",
              "Cơ chế lương",
              "Mức lương",
              "Trạng thái",
              "",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={9}
                message="Chưa có nhân viên nào"
                hint="Thêm hồ sơ nhân viên để chấm công và tính lương."
              />
            ) : (
              rows.map((employee) => (
                <tr key={employee.id} className="hover:bg-muted/50">
                  <Td className="font-mono text-xs font-semibold text-primary">
                    NV{String(employee.id).padStart(3, "0")}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
                        {employee.name
                          .split(" ")
                          .slice(-2)
                          .map((word) => word[0])
                          .join("")}
                      </span>
                      <span className="font-medium">{employee.name}</span>
                    </div>
                  </Td>
                  <Td className="text-muted-foreground">{employee.position}</Td>
                  <Td className="text-xs text-muted-foreground">
                    <p className="num">{employee.phone || "—"}</p>
                    <p>{employee.email || "—"}</p>
                  </Td>
                  <Td className="num text-muted-foreground">{dateVN(employee.startDate)}</Td>
                  <Td>
                    <Pill tone={employee.salaryType === "monthly" ? "primary" : "gold"}>
                      {salaryTypeLabels[employee.salaryType]}
                    </Pill>
                  </Td>
                  <Td className="num font-semibold">
                    {employee.salaryType === "monthly"
                      ? vnd(employee.monthlySalary)
                      : `${vnd(employee.hourlyRate)}/giờ`}
                  </Td>
                  <Td>
                    <Pill tone={employee.status === "active" ? "success" : "muted"}>
                      {employeeStatusLabels[employee.status]}
                    </Pill>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {hasRole("admin", "hr") ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === employee.id}
                          onClick={() => toggleStatus(employee)}
                        >
                          {employee.status === "active" ? "Cho nghỉ" : "Kích hoạt"}
                        </Button>
                      ) : null}
                      {hasRole("admin") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá nhân viên"
                          disabled={busyId === employee.id}
                          onClick={() => handleDelete(employee)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm nhân viên</DialogTitle>
            <DialogDescription>
              Cơ chế lương quyết định cách hệ thống tính lương từ dữ liệu chấm công.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Họ và tên" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Trần Thị Kim Ngân"
                required
              />
            </Field>
            <Field label="Chức vụ">
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Kế toán trưởng"
                required
              />
            </Field>
            <Field label="Ngày vào làm">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Điện thoại">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0938 221 114"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ngan.tt@bizcare.vn"
              />
            </Field>
            <Field label="Cơ chế lương">
              <select
                className="field"
                value={form.salaryType}
                onChange={(e) => setForm({ ...form, salaryType: e.target.value })}
              >
                <option value="monthly">Theo tháng</option>
                <option value="hourly">Theo giờ</option>
              </select>
            </Field>
            {form.salaryType === "monthly" ? (
              <Field label="Lương tháng (VNĐ)">
                <Input
                  type="number"
                  min="0"
                  value={form.monthlySalary}
                  onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                  placeholder="18000000"
                />
              </Field>
            ) : (
              <Field label="Lương theo giờ (VNĐ)">
                <Input
                  type="number"
                  min="0"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                  placeholder="45000"
                />
              </Field>
            )}
            <Field label="Giờ làm việc mỗi ngày">
              <Input
                type="number"
                min="1"
                step="0.5"
                value={form.workingHoursPerDay}
                onChange={(e) => setForm({ ...form, workingHoursPerDay: e.target.value })}
              />
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Thông tin bổ sung về hợp đồng"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu nhân viên"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
