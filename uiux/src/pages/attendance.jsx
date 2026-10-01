import { useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, Clock, Loader2, PlusCircle, Trash2 } from "lucide-react";

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
import { attendanceApi, employeesApi } from "@/lib/api";
import { currentMonthValue, dateVN, num, parseMonthValue, todayISO } from "@/lib/format";
import { attendanceStatus } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const STATUS_OPTIONS = [
  { value: "present", label: "Đủ ca" },
  { value: "late", label: "Đi muộn" },
  { value: "half_day", label: "Nửa ca" },
  { value: "leave", label: "Nghỉ phép" },
  { value: "absent", label: "Nghỉ không phép" },
];

const emptyForm = () => ({
  employeeId: "",
  date: todayISO(),
  status: "present",
  hoursWorked: "8",
  checkIn: "08:00",
  checkOut: "17:30",
  notes: "",
});

export default function AttendancePage() {
  const { hasRole } = useAuth();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { year, month } = parseMonthValue(monthValue);

  const records = useResource(() => attendanceApi.getAll({ year, month }), [year, month]);
  const employees = useResource(() => employeesApi.getAll(), []);

  const rows = records.data || [];
  const employeeList = employees.data || [];
  const employeeById = useMemo(
    () => new Map(employeeList.map((e) => [e.id, e])),
    [employeeList],
  );

  const filtered = useMemo(
    () => (statusFilter ? rows.filter((r) => r.status === statusFilter) : rows),
    [rows, statusFilter],
  );

  const stats = useMemo(
    () => ({
      present: rows.filter((r) => r.status === "present").length,
      away: rows.filter((r) => r.status === "leave" || r.status === "absent").length,
      totalHours: rows.reduce((sum, r) => sum + (r.hoursWorked || 0), 0),
    }),
    [rows],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await attendanceApi.create({
        employeeId: Number(form.employeeId),
        date: form.date,
        status: form.status,
        hoursWorked: Number(form.hoursWorked) || 0,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        notes: form.notes.trim() || undefined,
      });
      setOpen(false);
      setForm(emptyForm());
      setNotice({ tone: "success", message: "Đã ghi nhận chấm công" });
      records.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    setBusyId(record.id);
    setNotice(null);
    try {
      await attendanceApi.remove(record.id);
      setNotice({ tone: "success", message: "Đã xoá bản ghi chấm công" });
      records.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Nhật ký chấm công & Giờ làm"
        actions={
          hasRole("admin", "hr") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <PlusCircle className="size-4" /> Ghi nhận chấm công
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Lượt đi làm đầy đủ"
          value={stats.present}
          currency={false}
          unit="ca"
          icon={<CalendarCheck className="size-4" />}
        />
        <StatCard
          label="Lượt nghỉ phép / vắng"
          value={stats.away}
          currency={false}
          unit="ca"
          icon={<CalendarDays className="size-4" />}
        />
        <StatCard
          label="Tổng giờ công ghi nhận"
          value={stats.totalHours}
          currency={false}
          unit="giờ"
          icon={<Clock className="size-4" />}
        />
      </div>

      <Panel
        className="mt-5"
        title="Bảng theo dõi chấm công"
        description="Dữ liệu lấy từ các bản ghi chấm công đã lưu trên hệ thống"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              className="h-8 w-40 text-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {records.loading ? (
          <LoadingBlock />
        ) : records.error ? (
          <ErrorBlock message={records.error} onRetry={records.reload} />
        ) : (
          <DataTable
            head={["Ngày", "Nhân viên", "Trạng thái", "Giờ vào", "Giờ ra", "Số giờ làm", "Ghi chú", ""]}
          >
            {filtered.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="Chưa có bản ghi chấm công nào trong kỳ"
                hint="Ghi nhận chấm công để hệ thống tính lương theo ngày công thực tế."
              />
            ) : (
              filtered.map((record) => {
                const employee = record.employee || employeeById.get(record.employeeId);
                const meta = attendanceStatus[record.status] || { label: record.status, tone: "muted" };

                return (
                  <tr key={record.id} className="hover:bg-muted/50">
                    <Td className="num text-xs text-muted-foreground">{dateVN(record.date)}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
                          {(employee?.name || "?")
                            .split(" ")
                            .slice(-2)
                            .map((word) => word[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="font-medium">{employee?.name || `NV #${record.employeeId}`}</p>
                          {employee ? (
                            <p className="text-xs text-muted-foreground">{employee.position}</p>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </Td>
                    <Td className="font-mono text-xs">{record.checkIn || "—"}</Td>
                    <Td className="font-mono text-xs">{record.checkOut || "—"}</Td>
                    <Td className="num font-semibold text-primary">
                      {record.hoursWorked > 0 ? `${num(record.hoursWorked)} giờ` : "—"}
                    </Td>
                    <Td className="max-w-[220px] text-xs text-muted-foreground">
                      <span className="block truncate">{record.notes || "—"}</span>
                    </Td>
                    <Td className="text-right">
                      {hasRole("admin", "hr") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá bản ghi"
                          disabled={busyId === record.id}
                          onClick={() => handleDelete(record)}
                        >
                          {busyId === record.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4 text-destructive" />
                          )}
                        </Button>
                      ) : null}
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTable>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ghi nhận chấm công</DialogTitle>
            <DialogDescription>
              Mỗi nhân viên chỉ chấm công một lần trong một ngày. Nửa ca được tính 0.5 ngày công.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nhân viên" className="sm:col-span-2">
              <select
                className="field"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                required
              >
                <option value="">— Chọn nhân viên —</option>
                {employeeList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.position}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ngày chấm công">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </Field>
            <Field label="Trạng thái">
              <select
                className="field"
                value={form.status}
                onChange={(e) => {
                  const status = e.target.value;
                  setForm({
                    ...form,
                    status,
                    hoursWorked: status === "present" ? "8" : status === "half_day" ? "4" : "0",
                  });
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Giờ vào">
              <Input
                type="time"
                value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
              />
            </Field>
            <Field label="Giờ ra">
              <Input
                type="time"
                value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
              />
            </Field>
            <Field label="Số giờ làm việc">
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.hoursWorked}
                onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
              />
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Lý do nghỉ, tăng ca…"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <PlusCircle className="size-4" />
                )}
                {saving ? "Đang lưu…" : "Lưu chấm công"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
