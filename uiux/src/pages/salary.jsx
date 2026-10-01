import { useMemo, useState } from "react";
import { Calculator, Loader2, Sparkles, Trash2, Wallet } from "lucide-react";

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
import { employeesApi, salariesApi } from "@/lib/api";
import { currentMonthValue, num, parseMonthValue, vnd } from "@/lib/format";
import { salaryTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

export default function SalaryPage() {
  const { hasRole } = useAuth();
  const [monthValue, setMonthValue] = useState(currentMonthValue());
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: "" });

  const { year, month } = parseMonthValue(monthValue);

  const salaries = useResource(() => salariesApi.getAll({ year, month }), [year, month]);
  const employees = useResource(() => employeesApi.getAll({ status: "active" }), []);

  const rows = salaries.data || [];
  const employeeList = employees.data || [];

  const totals = useMemo(
    () => ({
      net: rows.reduce((sum, s) => sum + (s.netSalary || 0), 0),
      deductions: rows.reduce((sum, s) => sum + (s.deductions || 0), 0),
      gross: rows.reduce(
        (sum, s) =>
          sum +
          (s.employee?.salaryType === "hourly"
            ? s.totalHoursWorked * s.baseSalary
            : s.baseSalary),
        0,
      ),
    }),
    [rows],
  );

  const handleCalculateOne = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const result = await salariesApi.calculate({
        employeeId: Number(form.employeeId),
        year,
        month,
      });
      setOpen(false);
      setForm({ employeeId: "" });
      setNotice({ tone: "success", message: result.message });
      salaries.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleCalculateAll = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await salariesApi.calculateAll({ year, month });
      setNotice({ tone: "success", message: result.message });
      salaries.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (salary) => {
    setBusyId(salary.id);
    setNotice(null);
    try {
      await salariesApi.remove(salary.id);
      setNotice({ tone: "success", message: "Đã xoá bản ghi lương" });
      salaries.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Bảng lương & Chi trả nhân sự"
        actions={
          hasRole("admin", "hr") ? (
            <>
              <Input
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
                className="h-8 w-40 text-xs"
              />
              <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
                <Calculator className="size-4" /> Tính lương 1 nhân viên
              </Button>
              <Button size="sm" onClick={handleCalculateAll} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Tính tự động tất cả NV
              </Button>
            </>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng quỹ lương thực lĩnh"
          value={totals.net}
          icon={<Wallet className="size-4" />}
        />
        <StatCard
          label="Tổng khấu trừ nghỉ không phép"
          value={totals.deductions}
          icon={<Calculator className="size-4" />}
        />
        <StatCard
          label="Nhân sự đã chốt lương"
          value={rows.length}
          currency={false}
          unit={`/${employeeList.length || 0} nhân viên`}
        />
      </div>

      <Panel
        className="mt-5"
        title={`Bảng thanh toán lương chi tiết — ${String(month).padStart(2, "0")}/${year}`}
        description="Số liệu tính từ bản ghi chấm công thật của nhân sự"
        bodyClassName="p-0"
      >
        {salaries.loading ? (
          <LoadingBlock />
        ) : salaries.error ? (
          <ErrorBlock message={salaries.error} onRetry={salaries.reload} />
        ) : (
          <DataTable
            head={[
              "Nhân viên",
              "Cơ chế lương",
              "Mức lương chuẩn",
              "Ngày công",
              "Nghỉ phép",
              "Vắng KP",
              "Tổng giờ",
              "Khấu trừ",
              "Lương thực lĩnh",
              "",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={10}
                message="Chưa có bảng lương cho kỳ này"
                hint="Chấm công đầy đủ rồi bấm “Tính tự động tất cả NV” để chốt bảng lương."
              />
            ) : (
              rows.map((salary) => {
                const employee = salary.employee;
                return (
                  <tr key={salary.id} className="hover:bg-muted/50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-primary">
                          {(employee?.name || "?")
                            .split(" ")
                            .slice(-2)
                            .map((word) => word[0])
                            .join("")}
                        </span>
                        <span className="font-medium">
                          {employee?.name || `NV #${salary.employeeId}`}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Pill tone={employee?.salaryType === "hourly" ? "gold" : "primary"}>
                        {salaryTypeLabels[employee?.salaryType] || "—"}
                      </Pill>
                    </Td>
                    <Td className="num text-muted-foreground">
                      {vnd(salary.baseSalary)}
                      {employee?.salaryType === "hourly" ? (
                        <span className="text-xs">/giờ</span>
                      ) : null}
                    </Td>
                    <Td className="num">{num(salary.totalWorkingDays)} ngày</Td>
                    <Td className="num text-muted-foreground">{num(salary.totalLeaveDays)}</Td>
                    <Td className={salary.totalAbsentDays > 0 ? "num text-destructive" : "num"}>
                      {num(salary.totalAbsentDays)}
                    </Td>
                    <Td className="num">{num(salary.totalHoursWorked)}h</Td>
                    <Td className="num text-destructive">
                      {salary.deductions > 0 ? `-${vnd(salary.deductions)}` : "—"}
                    </Td>
                    <Td className="num font-display font-bold text-primary">
                      {vnd(salary.netSalary)}
                    </Td>
                    <Td className="text-right">
                      {hasRole("admin") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá bản ghi lương"
                          disabled={busyId === salary.id}
                          onClick={() => handleDelete(salary)}
                        >
                          {busyId === salary.id ? (
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
            <DialogTitle>Tính lương một nhân viên</DialogTitle>
            <DialogDescription>
              Kỳ lương tháng {String(month).padStart(2, "0")}/{year}. Mỗi nhân viên chỉ được tính một
              lần cho mỗi tháng.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCalculateOne} className="grid gap-4">
            <Field label="Nhân viên">
              <select
                className="field"
                value={form.employeeId}
                onChange={(e) => setForm({ employeeId: e.target.value })}
                required
              >
                <option value="">— Chọn nhân viên —</option>
                {employeeList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {salaryTypeLabels[e.salaryType]}
                  </option>
                ))}
              </select>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Calculator className="size-4" />}
                {busy ? "Đang tính…" : "Tính lương"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
