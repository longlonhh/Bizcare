import { useMemo, useState } from "react";
import { Calculator, Loader2, PackageCheck, Plus, Trash2 } from "lucide-react";

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
import { productsApi, purchaseOrdersApi, suppliersApi } from "@/lib/api";
import { dateVN, num, todayISO, vnd } from "@/lib/format";
import { purchaseOrderStatus } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const VAT_RATES = [0, 5, 8, 10];
const emptyLine = () => ({ productId: "", quantity: 1, unitPrice: "", vatRate: 8, expectedSellingPrice: "" });

export default function PurchaseOrdersPage() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [form, setForm] = useState({
    supplierId: "",
    importDate: todayISO(),
    notes: "",
    items: [emptyLine()],
  });

  const orders = useResource(() => purchaseOrdersApi.getAll(), []);
  const suppliers = useResource(() => suppliersApi.getAll(), []);
  const products = useResource(() => productsApi.getAll(), []);

  const rows = orders.data || [];
  const productList = products.data || [];
  const supplierList = suppliers.data || [];

  const productById = useMemo(
    () => new Map(productList.map((p) => [p.id, p])),
    [productList],
  );

  // Tổng hợp nhanh cho các thẻ KPI
  const currentMonth = todayISO().slice(0, 7);
  const monthOrders = rows.filter((o) => String(o.importDate).startsWith(currentMonth));
  const monthValue = monthOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const monthVat = monthOrders.reduce((sum, o) => sum + (o.totalVat || 0), 0);
  const pendingCount = rows.filter((o) => o.status === "draft" || o.status === "confirmed").length;

  // Tổng tiền của phiếu đang lập
  const formTotals = useMemo(() => {
    let subtotal = 0;
    let vat = 0;
    for (const line of form.items) {
      const amount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
      subtotal += amount;
      vat += (amount * (Number(line.vatRate) || 0)) / 100;
    }
    return { subtotal, vat, total: subtotal + vat };
  }, [form.items]);

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
        expectedSellingPrice: line.expectedSellingPrice === "" ? undefined : Number(line.expectedSellingPrice),
      }));

    if (!form.supplierId) {
      setNotice({ tone: "error", message: "Vui lòng chọn nhà cung cấp" });
      return;
    }
    if (items.length === 0) {
      setNotice({ tone: "error", message: "Phiếu nhập cần ít nhất một dòng hàng hợp lệ" });
      return;
    }

    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplierId: Number(form.supplierId),
        importDate: form.importDate,
        notes: form.notes.trim() || undefined,
        items,
      });
      setOpen(false);
      setForm({ supplierId: "", importDate: todayISO(), notes: "", items: [emptyLine()] });
      setNotice({
        tone: "success",
        message: "Đã tạo phiếu nhập. Bấm “Nhập kho” để cộng tồn và ghi lịch sử thẻ kho.",
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
      await purchaseOrdersApi.confirm(order.id);
      setNotice({
        tone: "success",
        message: `Đã nhập kho theo phiếu ${order.code}. Tồn kho và giá vốn bình quân đã được cập nhật.`,
      });
      orders.reload();
      products.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (order) => {
    setBusyId(order.id);
    setNotice(null);
    try {
      await purchaseOrdersApi.remove(order.id);
      setNotice({ tone: "success", message: `Đã xoá phiếu nhập ${order.code}` });
      orders.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Phiếu nhập hàng & Nhập kho"
        actions={
          hasRole("admin", "warehouse") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Lập phiếu nhập
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Giá trị nhập tháng ${currentMonth}`} value={monthValue} />
        <StatCard label="VAT đầu vào trong tháng" value={monthVat} />
        <StatCard label="Phiếu chờ nhập kho" value={pendingCount} currency={false} unit="phiếu" />
      </div>

      <Panel className="mt-5" title="Danh sách phiếu nhập" bodyClassName="p-0">
        {orders.loading ? (
          <LoadingBlock />
        ) : orders.error ? (
          <ErrorBlock message={orders.error} onRetry={orders.reload} />
        ) : (
          <DataTable
            head={[
              "Mã phiếu",
              "Ngày nhập",
              "Nhà cung cấp",
              "Dòng hàng",
              "Tiền hàng",
              "VAT vào",
              "Tổng thanh toán",
              "Trạng thái",
              "",
            ]}
          >
            {rows.length === 0 ? (
              <EmptyRow
                colSpan={9}
                message="Chưa có phiếu nhập nào"
                hint="Lập phiếu nhập đầu tiên để đưa hàng vào kho."
              />
            ) : (
              rows.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50">
                  <Td className="font-semibold text-primary">{order.code}</Td>
                  <Td className="text-muted-foreground">{dateVN(order.importDate)}</Td>
                  <Td className="max-w-[220px]">
                    <p className="truncate font-medium">{order.supplier?.name || "—"}</p>
                  </Td>
                  <Td className="num">{order.items?.length || 0}</Td>
                  <Td className="num">{vnd(order.totalAmount)}</Td>
                  <Td className="num text-muted-foreground">{vnd(order.totalVat)}</Td>
                  <Td className="num font-semibold">{vnd(order.grandTotal)}</Td>
                  <Td>
                    <Pill tone={(purchaseOrderStatus[order.status] || {}).tone}>
                      {(purchaseOrderStatus[order.status] || {}).label || order.status}
                    </Pill>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      {hasRole("admin", "warehouse") && order.status === "confirmed" ? (
                        <Button
                          size="sm"
                          disabled={busyId === order.id}
                          onClick={() => handleConfirm(order)}
                        >
                          {busyId === order.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <PackageCheck className="size-3.5" />
                          )}
                          Nhập kho
                        </Button>
                      ) : null}
                      {hasRole("admin") && order.status !== "received" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá phiếu nhập"
                          disabled={busyId === order.id}
                          onClick={() => handleDelete(order)}
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lập phiếu nhập hàng</DialogTitle>
            <DialogDescription>
              Mã phiếu (PN000001…) do hệ thống sinh tự động. Sau khi lưu, phiếu ở trạng thái “Đã xác
              nhận” và sẵn sàng nhập kho.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nhà cung cấp">
                <select
                  className="field"
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  required
                >
                  <option value="">— Chọn nhà cung cấp —</option>
                  {supplierList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ngày nhập">
                <Input
                  type="date"
                  value={form.importDate}
                  onChange={(e) => setForm({ ...form, importDate: e.target.value })}
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
                  const amount = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);

                  return (
                    <div key={index} className="rounded-xl border border-border p-3">
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
                                      ? String(selected.costPrice)
                                      : line.unitPrice,
                                });
                              }}
                            >
                              <option value="">— Chọn sản phẩm —</option>
                              {productList.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.code} · {p.name}
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
                          <Field label="Đơn giá nhập">
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

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="num">
                          {product ? `Tồn hiện tại: ${num(product.currentStock)} ${product.unit}` : "—"}
                        </span>
                        <span className="num font-semibold text-foreground">
                          Thành tiền: {vnd(amount)}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Field label="Giá bán dự kiến (tuỳ chọn)">
                          <Input
                            type="number"
                            min="0"
                            value={line.expectedSellingPrice}
                            onChange={(e) =>
                              updateLine(index, { expectedSellingPrice: e.target.value })
                            }
                            placeholder={product ? String(product.sellingPrice) : ""}
                          />
                        </Field>
                      </div>
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

            <Field label="Ghi chú">
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Nhập hàng đợt 1 tháng 9"
              />
            </Field>

            <dl className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tiền hàng chưa thuế</dt>
                <dd className="num font-medium">{vnd(formTotals.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Thuế GTGT đầu vào</dt>
                <dd className="num font-medium">{vnd(formTotals.vat)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-display font-semibold">Tổng thanh toán</dt>
                <dd className="num font-display text-lg font-bold text-primary">
                  {vnd(formTotals.total)}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-dashed border-gold/50 bg-gold/10 p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-gold-foreground">
                <Calculator className="size-3.5" /> Tự động tính lại giá vốn bình quân gia quyền
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Giá vốn mới = (SL tồn cũ × Giá vốn cũ + SL nhập mới × Giá nhập mới) ÷ Tổng SL sau
                nhập. Việc tính toán diễn ra khi bạn xác nhận nhập kho.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu phiếu nhập"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
