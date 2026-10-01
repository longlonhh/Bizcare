import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, Trash2, Truck } from "lucide-react";

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
import { customersApi, productsApi, salesOrdersApi } from "@/lib/api";
import { dateVN, num, todayISO, vnd } from "@/lib/format";
import { salesOrderStatus } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const VAT_RATES = [0, 5, 8, 10];
const emptyLine = () => ({ productId: "", quantity: 1, unitPrice: "", vatRate: 8 });

export default function SalesOrdersPage() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({
    customerId: "",
    exportDate: todayISO(),
    discount: "",
    notes: "",
    items: [emptyLine()],
  });

  const orders = useResource(() => salesOrdersApi.getAll(), []);
  const customers = useResource(() => customersApi.getAll(), []);
  const products = useResource(() => productsApi.getAll(), []);

  const rows = orders.data || [];
  const productList = products.data || [];
  const customerList = customers.data || [];

  const productById = useMemo(() => new Map(productList.map((p) => [p.id, p])), [productList]);

  const today = todayISO();
  const todayOrders = rows.filter((o) => o.exportDate === today && o.status === "completed");
  const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const todayVat = todayOrders.reduce((sum, o) => sum + (o.totalVat || 0), 0);
  const pendingCount = rows.filter((o) => o.status === "draft" || o.status === "confirmed").length;

  const formTotals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    const shortage = [];

    for (const line of form.items) {
      const product = productById.get(Number(line.productId));
      const quantity = Number(line.quantity) || 0;
      const amount = quantity * (Number(line.unitPrice) || 0);
      subtotal += amount;
      vat += (amount * (Number(line.vatRate) || 0)) / 100;
      if (product && quantity > product.currentStock) {
        shortage.push(`${product.name} (còn ${product.currentStock})`);
      }
    }

    const discount = Number(form.discount) || 0;
    return { subtotal, vat, discount, total: subtotal + vat - discount, shortage };
  }, [form, productById]);

  const updateLine = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);

    const items = form.items
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({
        productId: Number(line.productId),
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice) || 0,
        vatRate: Number(line.vatRate) || 0,
      }));

    if (items.length === 0) {
      setNotice({ tone: "error", message: "Phiếu xuất cần ít nhất một dòng hàng hợp lệ" });
      return;
    }
    if (formTotals.shortage.length > 0) {
      setNotice({
        tone: "error",
        message: `Không đủ tồn kho: ${formTotals.shortage.join(", ")}`,
      });
      return;
    }

    setSaving(true);
    try {
      await salesOrdersApi.create({
        customerId: form.customerId ? Number(form.customerId) : undefined,
        exportDate: form.exportDate,
        discount: Number(form.discount) || 0,
        notes: form.notes.trim() || undefined,
        items,
      });
      setOpen(false);
      setForm({ customerId: "", exportDate: todayISO(), discount: "", notes: "", items: [emptyLine()] });
      setNotice({
        tone: "success",
        message: "Đã tạo phiếu xuất. Bấm “Xuất kho” để trừ tồn và ghi lịch sử thẻ kho.",
      });
      orders.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async (order) => {
    setBusyId(order.id);
    setNotice(null);
    try {
      await salesOrdersApi.confirm(order.id);
      setNotice({
        tone: "success",
        message: `Đã xuất kho theo phiếu ${order.code}. Tồn kho đã được trừ.`,
      });
      orders.reload();
      products.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Phiếu xuất hàng & Bán lẻ"
        actions={
          hasRole("admin", "warehouse") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Phiếu xuất mới
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Doanh số hôm nay" value={todayRevenue} hint={`${todayOrders.length} phiếu đã xuất`} />
        <StatCard label="VAT đầu ra phát sinh hôm nay" value={todayVat} />
        <StatCard label="Đơn chờ xuất kho" value={pendingCount} currency={false} unit="đơn" />
      </div>

      <Panel className="mt-5" title="Danh sách phiếu xuất" bodyClassName="p-0">
        {orders.loading ? (
          <LoadingBlock />
        ) : orders.error ? (
          <ErrorBlock message={orders.error} onRetry={orders.reload} />
        ) : (
          <DataTable
            head={[
              "Mã phiếu",
              "Ngày xuất",
              "Khách hàng",
              "Dòng",
              "Tiền hàng",
              "Chiết khấu",
              "VAT ra",
              "Khách phải trả",
              "Trạng thái",
              "",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={10}
                message="Chưa có phiếu xuất nào"
                hint="Tạo phiếu xuất để ghi nhận doanh thu và trừ tồn kho."
              />
            ) : (
              rows.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50">
                  <Td className="font-semibold text-primary">{order.code}</Td>
                  <Td className="text-muted-foreground">{dateVN(order.exportDate)}</Td>
                  <Td className="max-w-[200px]">
                    <p className="truncate font-medium">{order.customer?.name || "Khách lẻ"}</p>
                  </Td>
                  <Td className="num">{order.items?.length || 0}</Td>
                  <Td className="num">{vnd(order.totalAmount)}</Td>
                  <Td className="num text-muted-foreground">
                    {order.discount ? vnd(order.discount) : "—"}
                  </Td>
                  <Td className="num text-muted-foreground">{vnd(order.totalVat)}</Td>
                  <Td className="num font-semibold">{vnd(order.grandTotal)}</Td>
                  <Td>
                    <Pill tone={(salesOrderStatus[order.status] || {}).tone}>
                      {(salesOrderStatus[order.status] || {}).label || order.status}
                    </Pill>
                  </Td>
                  <Td className="text-right">
                    {hasRole("admin", "warehouse") && order.status === "confirmed" ? (
                      <Button
                        size="sm"
                        disabled={busyId === order.id}
                        onClick={() => handleConfirm(order)}
                      >
                        {busyId === order.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Truck className="size-3.5" />
                        )}
                        Xuất kho
                      </Button>
                    ) : null}
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lập phiếu xuất hàng</DialogTitle>
            <DialogDescription>
              Mã phiếu (PX000001…) do hệ thống sinh tự động. Hệ thống chặn bán vượt tồn kho hiện có.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Khách hàng" hint="Để trống nếu là khách lẻ">
                <select
                  className="field"
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                >
                  <option value="">Khách lẻ</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ngày xuất">
                <Input
                  type="date"
                  value={form.exportDate}
                  onChange={(e) => setForm({ ...form, exportDate: e.target.value })}
                  required
                />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dòng hàng
              </p>
              <div className="space-y-3">
                {form.items.map((line, index) => {
                  const product = productById.get(Number(line.productId));
                  const quantity = Number(line.quantity) || 0;
                  const notEnough = product && quantity > product.currentStock;

                  return (
                    <div
                      key={index}
                      className={
                        notEnough
                          ? "rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                          : "rounded-xl border border-border p-3"
                      }
                    >
                      <div className="grid gap-3 sm:grid-cols-12">
                        <div className="sm:col-span-5">
                          <Field label="Sản phẩm">
                            <select
                              className="field"
                              value={line.productId}
                              onChange={(e) => {
                                const selected = productById.get(Number(e.target.value));
                                updateLine(index, {
                                  productId: e.target.value,
                                  unitPrice:
                                    line.unitPrice === "" && selected
                                      ? String(selected.sellingPrice)
                                      : line.unitPrice,
                                });
                              }}
                            >
                              <option value="">— Chọn sản phẩm —</option>
                              {productList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} · {p.name} (tồn {p.currentStock})
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Số lượng">
                            <Input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(index, { quantity: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Đơn giá bán">
                            <Input
                              type="number"
                              min="0"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                            />
                          </Field>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="VAT %">
                            <select
                              className="field"
                              value={line.vatRate}
                              onChange={(e) => updateLine(index, { vatRate: e.target.value })}
                            >
                              {VAT_RATES.map((rate) => (
                                <option key={rate} value={rate}>
                                  {rate}%
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className="flex items-end sm:col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Xoá dòng"
                            disabled={form.items.length === 1}
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, i) => i !== index),
                              }))
                            }
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="num text-muted-foreground">
                          {product ? `Tồn khả dụng: ${num(product.currentStock)} ${product.unit}` : "—"}
                        </span>
                        <span className="num font-semibold">
                          {vnd(quantity * (Number(line.unitPrice) || 0))}
                        </span>
                      </div>

                      {notEnough ? (
                        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                          <AlertTriangle className="size-3.5" /> Vượt quá tồn kho hiện có
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyLine()] }))}
              >
                <Plus className="size-4" /> Thêm dòng hàng
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Chiết khấu (VNĐ)">
                <Input
                  type="number"
                  min="0"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  placeholder="0"
                />
              </Field>
              <Field label="Ghi chú">
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Giao tại kho khách"
                />
              </Field>
            </div>

            <dl className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tiền hàng</dt>
                <dd className="num">{vnd(formTotals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Chiết khấu</dt>
                <dd className="num text-destructive">− {vnd(formTotals.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Thuế GTGT đầu ra</dt>
                <dd className="num">{vnd(formTotals.vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-display font-semibold">Khách phải trả</dt>
                <dd className="num font-display text-lg font-bold text-primary">
                  {vnd(formTotals.total)}
                </dd>
              </div>
            </dl>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu phiếu xuất"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
