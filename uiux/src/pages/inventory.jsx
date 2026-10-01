import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  Coins,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
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
import { inventoryApi, productsApi } from "@/lib/api";
import { dateTimeVN, num, vnd } from "@/lib/format";
import { inventoryLogType, referenceTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const LOG_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "import", label: "Nhập kho" },
  { value: "export", label: "Xuất kho" },
  { value: "adjustment", label: "Kiểm kê" },
];

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [logType, setLogType] = useState("");
  const [logFrom, setLogFrom] = useState("");
  const [logTo, setLogTo] = useState("");
  const [notice, setNotice] = useState(null);

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ productId: "", adjustment: "", notes: "" });

  const summary = useResource(() => inventoryApi.getSummary(), []);
  const lowStock = useResource(() => inventoryApi.getLowStock(), []);
  const logs = useResource(
    () => inventoryApi.getLogs({ type: logType || undefined, from: logFrom || undefined, to: logTo || undefined }),
    [logType, logFrom, logTo],
  );
  const products = useResource(() => productsApi.getAll(), []);

  const rows = summary.data || [];
  const logRows = logs.data || [];

  const lowCount = lowStock.data?.count || 0;
  const totalStockValue = rows.reduce((sum, p) => sum + (p.stockValue || 0), 0);
  const safeCount = Math.max(0, rows.length - lowCount);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((p) => {
      const matchesKeyword =
        !keyword ||
        p.name?.toLowerCase().includes(keyword) ||
        p.code?.toLowerCase().includes(keyword);
      if (!matchesKeyword) return false;
      if (statusFilter === "low") return p.isLowStock;
      if (statusFilter === "normal") return !p.isLowStock;
      return true;
    });
  }, [rows, search, statusFilter]);

  const handleAdjust = async (event) => {
    event.preventDefault();
    setAdjusting(true);
    setNotice(null);
    try {
      await inventoryApi.adjust({
        productId: Number(adjustForm.productId),
        adjustment: Number(adjustForm.adjustment),
        notes: adjustForm.notes.trim() || undefined,
      });
      setAdjustOpen(false);
      setAdjustForm({ productId: "", adjustment: "", notes: "" });
      setNotice({
        tone: "success",
        message: "Đã điều chỉnh tồn kho và ghi vào lịch sử thẻ kho",
      });
      summary.reload();
      lowStock.reload();
      logs.reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Tồn kho & Thẻ kho"
        actions={
          hasRole("admin") ? (
            <Button size="sm" onClick={() => setAdjustOpen(true)}>
              <Scale className="size-4" /> Điều chỉnh kiểm kê
            </Button>
          ) : null
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng mặt hàng (SKU)"
          value={rows.length}
          currency={false}
          unit="SKU"
          icon={<ClipboardList className="size-4" />}
        />
        <StatCard
          label="Tổng giá trị tồn kho"
          value={totalStockValue}
          hint="Tính theo giá vốn bình quân"
          icon={<Coins className="size-4" />}
        />
        <StatCard
          label="Cảnh báo thiếu hàng"
          value={lowCount}
          currency={false}
          unit="SKU"
          hint="Dưới ngưỡng an toàn"
          icon={<AlertTriangle className="size-4" />}
        />
        <StatCard
          label="Tồn kho an toàn"
          value={safeCount}
          currency={false}
          unit="SKU"
          icon={<ShieldCheck className="size-4" />}
        />
      </div>

      <Panel
        className="mt-5"
        title="Bảng kê tồn kho"
        description="Số liệu lấy trực tiếp từ danh mục sản phẩm và chứng từ đã xác nhận"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc mã SP…"
                className="w-56 pl-9"
              />
            </div>
            {[
              { value: "all", label: `Tất cả (${rows.length})` },
              { value: "low", label: `Cần nhập (${lowCount})` },
              { value: "normal", label: `An toàn (${safeCount})` },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {summary.loading ? (
          <LoadingBlock />
        ) : summary.error ? (
          <ErrorBlock message={summary.error} onRetry={summary.reload} />
        ) : (
          <DataTable
            head={[
              "Mã SP",
              "Tên sản phẩm",
              "ĐVT",
              "Tồn thực tế",
              "Định mức",
              "Giá vốn BQ",
              "Giá trị tồn",
              "Trạng thái",
            ]}
          >
            {filteredRows.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="Chưa có mặt hàng nào trong kho"
                hint="Thêm sản phẩm rồi lập phiếu nhập kho để bắt đầu quản lý tồn."
              />
            ) : (
              filteredRows.map((product) => (
                <tr key={product.id} className="hover:bg-muted/50">
                  <Td className="font-mono text-xs font-semibold text-primary">{product.code}</Td>
                  <Td className="font-medium">{product.name}</Td>
                  <Td>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {product.unit || "—"}
                    </span>
                  </Td>
                  <Td
                    className={
                      product.isLowStock
                        ? "num text-base font-bold text-destructive"
                        : "num text-base font-bold"
                    }
                  >
                    {num(product.currentStock)}
                  </Td>
                  <Td className="num text-muted-foreground">{num(product.minStock)}</Td>
                  <Td className="num text-muted-foreground">{vnd(product.costPrice)}</Td>
                  <Td className="num font-semibold">{vnd(product.stockValue)}</Td>
                  <Td>
                    {product.isLowStock ? (
                      <Pill tone="danger">
                        <AlertTriangle className="size-3.5" /> Sắp hết hàng
                      </Pill>
                    ) : (
                      <Pill tone="success">
                        <ShieldCheck className="size-3.5" /> Đầy đủ
                      </Pill>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </DataTable>
        )}
      </Panel>

      {/* Lịch sử biến động thẻ kho — dữ liệu thật từ mọi thao tác nhập/xuất/kiểm kê */}
      <Panel
        className="mt-5"
        title="Lịch sử biến động thẻ kho"
        description="Ghi nhận tự động từ phiếu nhập, phiếu xuất và kiểm kê — không có dữ liệu nhập tay từ code"
        bodyClassName="p-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
            >
              {LOG_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={logFrom}
              onChange={(e) => setLogFrom(e.target.value)}
              className="h-8 w-36 text-xs"
              title="Từ ngày"
            />
            <Input
              type="date"
              value={logTo}
              onChange={(e) => setLogTo(e.target.value)}
              className="h-8 w-36 text-xs"
              title="Đến ngày"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={logs.reload}
              disabled={logs.loading}
              title="Tải lại lịch sử"
            >
              {logs.loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Làm mới
            </Button>
          </div>
        }
      >
        {logs.loading ? (
          <LoadingBlock label="Đang tải lịch sử thẻ kho…" />
        ) : logs.error ? (
          <ErrorBlock message={logs.error} onRetry={logs.reload} />
        ) : (
          <DataTable
            head={[
              "Mã GD",
              "Thời điểm",
              "Sản phẩm",
              "Loại giao dịch",
              "Chứng từ",
              "Số lượng",
              "Tồn sau GD",
              "Diễn giải",
            ]}
          >
            {logRows.length === 0 ? (
              <EmptyRow
                colSpan={8}
                message="Chưa có biến động kho nào"
                hint="Lịch sử sẽ tự sinh khi bạn xác nhận nhập kho, xuất kho hoặc điều chỉnh kiểm kê."
              />
            ) : (
              logRows.map((log) => {
                const meta = inventoryLogType[log.type] || { label: log.type, tone: "muted" };
                return (
                  <tr key={log.id} className="hover:bg-muted/50">
                    <Td className="font-mono text-xs text-muted-foreground">
                      MV-{String(log.id).padStart(5, "0")}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {dateTimeVN(log.createdAt)}
                    </Td>
                    <Td className="font-medium">
                      {log.product?.name || `Sản phẩm #${log.productId}`}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {log.product?.code}
                      </span>
                    </Td>
                    <Td>
                      <Pill tone={meta.tone}>{meta.label}</Pill>
                    </Td>
                    <Td>
                      {log.referenceCode ? (
                        <>
                          <span className="font-semibold text-primary">{log.referenceCode}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {referenceTypeLabels[log.referenceType] || log.referenceType}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {referenceTypeLabels[log.referenceType] || log.referenceType}
                        </span>
                      )}
                    </Td>
                    <Td
                      className={
                        log.quantity > 0
                          ? "num font-semibold text-success"
                          : "num font-semibold text-destructive"
                      }
                    >
                      {log.quantity > 0 ? "+" : ""}
                      {num(log.quantity)}
                    </Td>
                    <Td className="num">
                      {num(log.stockAfter)}
                      <span className="ml-1 text-xs text-muted-foreground">
                        (từ {num(log.stockBefore)})
                      </span>
                    </Td>
                    <Td className="max-w-[240px] text-xs text-muted-foreground">
                      <span className="block truncate">{log.notes || "—"}</span>
                    </Td>
                  </tr>
                );
              })
            )}
          </DataTable>
        )}
      </Panel>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Điều chỉnh tồn kho (kiểm kê)</DialogTitle>
            <DialogDescription>
              Nhập số lượng chênh lệch so với sổ sách. Hệ thống sẽ ghi lại thành một bản ghi lịch sử
              thẻ kho.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdjust} className="grid gap-4">
            <Field label="Sản phẩm">
              <select
                className="field"
                value={adjustForm.productId}
                onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                required
              >
                <option value="">— Chọn sản phẩm —</option>
                {(products.data || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name} (tồn {p.currentStock})
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Số lượng điều chỉnh"
              hint="Dùng số dương để tăng tồn, số âm để giảm tồn. Ví dụ: -3 khi kiểm kê thiếu 3 đơn vị."
            >
              <Input
                type="number"
                value={adjustForm.adjustment}
                onChange={(e) => setAdjustForm({ ...adjustForm, adjustment: e.target.value })}
                placeholder="-3"
                required
              />
            </Field>

            <Field label="Lý do / ghi chú">
              <Input
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder="Kiểm kê ngày 30/09 phát hiện thiếu 3 túi"
              />
            </Field>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdjustOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={adjusting}>
                {adjusting ? <Loader2 className="size-4 animate-spin" /> : <Scale className="size-4" />}
                {adjusting ? "Đang lưu…" : "Xác nhận điều chỉnh"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
