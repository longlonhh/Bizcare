import { useMemo, useState } from "react";
import { Loader2, Mail, MapPin, Phone, Plus, Trash2 } from "lucide-react";

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
import { purchaseOrdersApi, suppliersApi } from "@/lib/api";
import { vnd } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = { name: "", taxCode: "", phone: "", email: "", address: "", notes: "" };

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const suppliers = useResource(() => suppliersApi.getAll(), []);
  const orders = useResource(() => purchaseOrdersApi.getAll(), []);

  const rows = suppliers.data || [];

  // Giá trị nhập hàng thực tế theo từng nhà cung cấp (từ chứng từ đã nhập kho)
  const valueBySupplier = useMemo(() => {
    const map = new Map();
    for (const order of orders.data || []) {
      if (order.status !== "received") continue;
      map.set(order.supplierId, (map.get(order.supplierId) || 0) + (order.totalAmount || 0));
    }
    return map;
  }, [orders.data]);

  const totalPurchaseValue = [...valueBySupplier.values()].reduce((sum, value) => sum + value, 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await suppliersApi.create({
        name: form.name.trim(),
        taxCode: form.taxCode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", message: "Đã thêm nhà cung cấp mới" });
      suppliers.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier) => {
    setBusyId(supplier.id);
    setNotice(null);
    try {
      await suppliersApi.remove(supplier.id);
      setNotice({ tone: "success", message: `Đã xoá nhà cung cấp ${supplier.code}` });
      suppliers.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Nhà cung cấp"
        actions={
          hasRole("admin") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Thêm nhà cung cấp
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Đối tác đang hợp tác" value={rows.length} currency={false} unit="NCC" />
        <StatCard label="Giá trị nhập hàng đã nhập kho" value={totalPurchaseValue} />
        <StatCard
          label="Đối tác đã phát sinh giao dịch"
          value={valueBySupplier.size}
          currency={false}
          unit="NCC"
        />
      </div>

      <Panel
        className="mt-5"
        title="Bảng theo dõi nhà cung cấp"
        description="Giá trị nhập hàng chỉ tính trên các phiếu đã xác nhận nhập kho"
        bodyClassName="p-0"
      >
        {suppliers.loading ? (
          <LoadingBlock />
        ) : suppliers.error ? (
          <ErrorBlock message={suppliers.error} onRetry={suppliers.reload} />
        ) : (
          <DataTable
            head={[
              "Mã NCC",
              "Tên đối tác",
              "MST",
              "Liên hệ",
              "Địa chỉ",
              "Giá trị nhập kho",
              "Trạng thái",
              "",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="Chưa có nhà cung cấp nào"
                hint="Thêm nhà cung cấp để lập được phiếu nhập hàng."
              />
            ) : (
              rows.map((supplier) => {
                const value = valueBySupplier.get(supplier.id) || 0;
                return (
                  <tr key={supplier.id} className="hover:bg-muted/50">
                    <Td className="font-semibold text-primary">{supplier.code}</Td>
                    <Td className="font-medium">{supplier.name}</Td>
                    <Td className="num text-muted-foreground">{supplier.taxCode || "—"}</Td>
                    <Td className="text-xs text-muted-foreground">
                      <p className="flex items-center gap-1.5">
                        <Phone className="size-3.5" /> {supplier.phone || "—"}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Mail className="size-3.5" /> {supplier.email || "—"}
                      </p>
                    </Td>
                    <Td className="max-w-[240px] text-xs text-muted-foreground">
                      <span className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span className="truncate">{supplier.address || "—"}</span>
                      </span>
                    </Td>
                    <Td className={value > 0 ? "num font-semibold" : "num text-muted-foreground"}>
                      {value > 0 ? vnd(value) : "—"}
                    </Td>
                    <Td>
                      <Pill tone={value > 0 ? "primary" : "muted"}>
                        {value > 0 ? "Đã giao dịch" : "Chưa giao dịch"}
                      </Pill>
                    </Td>
                    <Td className="text-right">
                      {hasRole("admin") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá nhà cung cấp"
                          disabled={busyId === supplier.id}
                          onClick={() => handleDelete(supplier)}
                        >
                          {busyId === supplier.id ? (
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
            <DialogTitle>Thêm nhà cung cấp</DialogTitle>
            <DialogDescription>Mã NCC (NCC1, NCC2…) do hệ thống sinh tự động.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên đối tác" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Công ty CP Lương thực Miền Nam"
                required
              />
            </Field>
            <Field label="Mã số thuế">
              <Input
                value={form.taxCode}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
                placeholder="0301454789"
              />
            </Field>
            <Field label="Điện thoại">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="028 3822 1145"
              />
            </Field>
            <Field label="Email nhận đơn" className="sm:col-span-2">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="order@nhacungcap.vn"
              />
            </Field>
            <Field label="Địa chỉ" className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Kho Bình Chánh, TP.HCM"
              />
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Điều khoản thanh toán, thời gian giao hàng…"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu nhà cung cấp"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
