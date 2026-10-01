import { useMemo, useState } from "react";
import { Loader2, Plus, UserPlus } from "lucide-react";

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
import { customersApi, salesOrdersApi } from "@/lib/api";
import { vnd } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { name: "", taxCode: "", phone: "", email: "", address: "", notes: "" };

export default function CustomersPage() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const customers = useResource(() => customersApi.getAll(), []);
  const orders = useResource(() => salesOrdersApi.getAll(), []);

  const rows = customers.data || [];

  // Doanh số thực tế trên các phiếu đã xuất kho
  const revenueByCustomer = useMemo(() => {
    const map = new Map();
    for (const order of orders.data || []) {
      if (order.status !== "completed" || order.customerId == null) continue;
      map.set(order.customerId, (map.get(order.customerId) || 0) + (order.grandTotal || 0));
    }
    return map;
  }, [orders.data]);

  const totalRevenue = [...revenueByCustomer.values()].reduce((sum, value) => sum + value, 0);
  const businessCount = rows.filter((c) => c.taxCode).length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await customersApi.create({
        name: form.name.trim(),
        taxCode: form.taxCode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", message: "Đã thêm khách hàng mới" });
      customers.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Khách hàng (CRM)"
        actions={
          hasRole("admin", "accountant") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus className="size-4" /> Thêm khách hàng
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng khách hàng" value={rows.length} currency={false} unit="KH" />
        <StatCard label="Doanh số lũy kế đã xuất kho" value={totalRevenue} />
        <StatCard
          label="Khách doanh nghiệp (có MST)"
          value={businessCount}
          currency={false}
          unit="KH"
        />
      </div>

      <Panel
        className="mt-5"
        title="Danh bạ khách hàng"
        description="Email và MST được dùng tự động khi phát hành hóa đơn điện tử"
        bodyClassName="p-0"
      >
        {customers.loading ? (
          <LoadingBlock />
        ) : customers.error ? (
          <ErrorBlock message={customers.error} onRetry={customers.reload} />
        ) : (
          <DataTable
            head={["Mã KH", "Tên khách hàng", "Loại", "MST", "Điện thoại", "Email nhận HĐĐT", "Địa chỉ", "Doanh số"]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="Chưa có khách hàng nào"
                hint="Thêm khách hàng để chọn khi lập phiếu xuất và phát hành hoá đơn."
              />
            ) : (
              rows.map((customer) => {
                const revenue = revenueByCustomer.get(customer.id) || 0;
                return (
                  <tr key={customer.id} className="hover:bg-muted/50">
                    <Td className="font-semibold text-primary">{customer.code}</Td>
                    <Td className="font-medium">{customer.name}</Td>
                    <Td>
                      <Pill tone={customer.taxCode ? "primary" : "muted"}>
                        {customer.taxCode ? "Doanh nghiệp" : "Cá nhân"}
                      </Pill>
                    </Td>
                    <Td className="num text-muted-foreground">{customer.taxCode || "—"}</Td>
                    <Td className="num">{customer.phone || "—"}</Td>
                    <Td className="text-muted-foreground">{customer.email || "—"}</Td>
                    <Td className="max-w-[220px] text-muted-foreground">
                      <span className="block truncate">{customer.address || "—"}</span>
                    </Td>
                    <Td className={revenue > 0 ? "num font-semibold" : "num text-muted-foreground"}>
                      {revenue > 0 ? vnd(revenue) : "—"}
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
            <DialogTitle>Thêm khách hàng</DialogTitle>
            <DialogDescription>
              Mã KH (KH1, KH2…) do hệ thống sinh tự động. Điền MST nếu là khách doanh nghiệp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên khách hàng" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Siêu thị mini Hoa Mai"
                required
              />
            </Field>
            <Field label="Mã số thuế">
              <Input
                value={form.taxCode}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                placeholder="0316558741"
              />
            </Field>
            <Field label="Điện thoại">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0938 112 445"
              />
            </Field>
            <Field label="Email nhận hoá đơn" className="sm:col-span-2">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ketoan@khachhang.vn"
              />
            </Field>
            <Field label="Địa chỉ" className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="12 Lê Văn Sỹ, Q.3, TP.HCM"
              />
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Chính sách công nợ, người liên hệ…"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu khách hàng"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
