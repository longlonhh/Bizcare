import { useMemo, useState } from "react";
import { FileSignature, Loader2, Plus, QrCode, ShieldCheck, Trash2 } from "lucide-react";

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
import { invoicesApi, salesOrdersApi } from "@/lib/api";
import { dateVN, vnd } from "@/lib/format";
import { invoiceStatusLabels, invoiceTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

export default function InvoicesPage() {
  const { hasRole } = useAuth();
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ salesOrderId: "", type: "retail" });
  const [selectedId, setSelectedId] = useState(null);
  const [qr, setQr] = useState(null);

  const invoices = useResource(() => invoicesApi.getAll(), []);
  const orders = useResource(() => salesOrdersApi.getAll(), []);

  const rows = invoices.data || [];
  const invoicedOrderIds = new Set(rows.map((i) => i.salesOrderId));

  // Chỉ phiếu xuất đã xuất kho và chưa có hoá đơn mới lập được hoá đơn
  const eligibleOrders = (orders.data || []).filter(
    (o) => o.status === "completed" && !invoicedOrderIds.has(o.id),
  );

  const selected = useMemo(
    () => rows.find((i) => i.id === selectedId) || rows[0] || null,
    [rows, selectedId],
  );

  const stats = useMemo(() => {
    const issued = rows.filter((i) => i.status === "issued");
    const draft = rows.filter((i) => i.status !== "issued");
    return {
      total: rows.length,
      issuedCount: issued.length,
      issuedValue: issued.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
      draftValue: draft.reduce((sum, i) => sum + (i.grandTotal || 0), 0),
    };
  }, [rows]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const result = await invoicesApi.createFromOrder(Number(form.salesOrderId), form.type);
      setOpen(false);
      setForm({ salesOrderId: "", type: "retail" });
      setNotice({ tone: "success", message: `${result.message} (${result.invoice.code})` });
      invoices.reload();
      setSelectedId(result.invoice.id);
      setQr(null);
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleIssue = async (invoice) => {
    setBusyId(invoice.id);
    setNotice(null);
    try {
      await invoicesApi.issue(invoice.id);
      setNotice({ tone: "success", message: `Hoá đơn ${invoice.code} đã được phát hành` });
      invoices.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleShowQr = async (invoice) => {
    setBusyId(invoice.id);
    setNotice(null);
    try {
      setQr(await invoicesApi.getVietQR(invoice.id));
      setSelectedId(invoice.id);
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (invoice) => {
    setBusyId(invoice.id);
    setNotice(null);
    try {
      await invoicesApi.remove(invoice.id);
      setNotice({ tone: "success", message: `Đã xoá hoá đơn ${invoice.code}` });
      if (selectedId === invoice.id) setSelectedId(null);
      invoices.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Hóa đơn & Thanh toán VietQR"
        actions={
          hasRole("admin", "accountant") ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="size-4" /> Lập hoá đơn
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Tổng hoá đơn" value={stats.total} currency={false} unit="HĐ" />
        <StatCard label="Đã phát hành" value={stats.issuedValue} hint={`${stats.issuedCount} hoá đơn`} />
        <StatCard label="Chờ phát hành" value={stats.draftValue} />
        <StatCard
          label="Phiếu xuất đủ điều kiện lập HĐ"
          value={eligibleOrders.length}
          currency={false}
          unit="phiếu"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Panel className="xl:col-span-3" title="Danh sách hóa đơn" bodyClassName="p-0">
          {invoices.loading ? (
            <LoadingBlock />
          ) : invoices.error ? (
            <ErrorBlock message={invoices.error} onRetry={invoices.reload} />
          ) : (
            <DataTable
              head={["Số hóa đơn", "Khách hàng", "Loại", "Tổng tiền", "Trạng thái", "Thao tác"]}
            >
              {rows.length === 0 ? (
                <EmptyRow
                  colSpan={6}
                  message="Chưa có hoá đơn nào"
                  hint="Hoá đơn chỉ lập được từ phiếu xuất đã xác nhận xuất kho."
                />
              ) : (
                rows.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={
                      selected?.id === invoice.id ? "bg-secondary/60" : "hover:bg-muted/50"
                    }
                  >
                    <Td className="font-semibold text-primary">{invoice.code}</Td>
                    <Td className="max-w-[200px]">
                      <p className="truncate font-medium">{invoice.customerName || "Khách lẻ"}</p>
                    </Td>
                    <Td>
                      <Pill tone={invoice.type === "einvoice" ? "primary" : "muted"}>
                        {invoiceTypeLabels[invoice.type]}
                      </Pill>
                    </Td>
                    <Td className="num font-semibold">{vnd(invoice.grandTotal)}</Td>
                    <Td>
                      <Pill tone={invoice.status === "issued" ? "success" : "warning"}>
                        {invoiceStatusLabels[invoice.status]}
                      </Pill>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === invoice.id}
                          onClick={() => handleShowQr(invoice)}
                        >
                          <QrCode className="size-3.5" /> VietQR
                        </Button>
                        {invoice.status !== "issued" ? (
                          <Button
                            size="sm"
                            disabled={busyId === invoice.id}
                            onClick={() => handleIssue(invoice)}
                          >
                            {busyId === invoice.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ShieldCheck className="size-3.5" />
                            )}
                            Phát hành
                          </Button>
                        ) : null}
                        {hasRole("admin") && invoice.status !== "issued" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Xoá hoá đơn"
                            disabled={busyId === invoice.id}
                            onClick={() => handleDelete(invoice)}
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

        <Panel
          className="xl:col-span-2"
          title="Mã thanh toán VietQR động"
          description={qr ? `Cho hóa đơn ${qr.invoiceId}` : "Chọn một hóa đơn để sinh mã"}
        >
          {!qr ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Bấm “VietQR” ở một hoá đơn để tạo mã thanh toán.
            </p>
          ) : (
            <>
              <div className="rounded-2xl border border-border bg-secondary p-5 text-center">
                <div className="mx-auto grid size-44 place-items-center rounded-xl border border-border bg-card">
                  <QrCode className="size-28 text-primary" strokeWidth={1.1} />
                </div>
                <p className="num mt-3 font-display text-lg font-bold text-primary">
                  {vnd(qr.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quét bằng bất kỳ app ngân hàng nào (NAPAS 247)
                </p>
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ["Ngân hàng", qr.bankName],
                  ["Số tài khoản", qr.bankAccount],
                  ["Nội dung CK", `TT HD ${qr.invoiceId}`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 border-b border-border pb-2"
                  >
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-3 break-all rounded-lg bg-muted p-3 text-[11px] text-muted-foreground">
                {qr.qrData}
              </p>
            </>
          )}
        </Panel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lập hoá đơn từ phiếu xuất</DialogTitle>
            <DialogDescription>
              Chỉ hiển thị các phiếu xuất đã xác nhận xuất kho và chưa có hoá đơn.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="grid gap-4">
            <Field label="Phiếu xuất kho">
              <select
                className="field"
                value={form.salesOrderId}
                onChange={(e) => setForm({ ...form, salesOrderId: e.target.value })}
                required
              >
                <option value="">— Chọn phiếu xuất —</option>
                {eligibleOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.code} · {order.customer?.name || "Khách lẻ"} · {vnd(order.grandTotal)}
                  </option>
                ))}
              </select>
            </Field>

            {eligibleOrders.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                Hiện không có phiếu xuất nào đủ điều kiện. Hãy xác nhận xuất kho ở phân hệ Phiếu xuất
                hàng trước.
              </p>
            ) : null}

            <Field label="Loại hoá đơn">
              <select
                className="field"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="retail">Bán lẻ (HDBL)</option>
                <option value="einvoice">Hoá đơn điện tử VAT (HDDT)</option>
              </select>
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={busy || eligibleOrders.length === 0}>
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileSignature className="size-4" />
                )}
                {busy ? "Đang lập…" : "Tạo hoá đơn"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
