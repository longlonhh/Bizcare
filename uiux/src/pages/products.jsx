import { useMemo, useState } from "react";
import { Copy, Loader2, Plus, QrCode, Search, Trash2 } from "lucide-react";

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
import { productsApi } from "@/lib/api";
import { num, pct, vnd } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

const EMPTY_FORM = {
  name: "",
  unit: "cái",
  barcode: "",
  costPrice: "",
  sellingPrice: "",
  minStock: "",
  description: "",
};

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data, loading, error, reload } = useResource(() => productsApi.getAll(), []);
  const products = data || [];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(keyword) ||
        p.code?.toLowerCase().includes(keyword) ||
        p.barcode?.toLowerCase().includes(keyword),
    );
  }, [products, search]);

  const totalValue = products.reduce((sum, p) => sum + p.costPrice * p.currentStock, 0);
  const avgMargin =
    products.length === 0
      ? 0
      : products.reduce(
          (sum, p) => sum + (p.sellingPrice > 0 ? ((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100 : 0),
          0,
        ) / products.length;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await productsApi.create({
        name: form.name.trim(),
        unit: form.unit.trim() || "cái",
        barcode: form.barcode.trim(),
        costPrice: Number(form.costPrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        minStock: Number(form.minStock) || 0,
        description: form.description.trim(),
      });
      setOpen(false);
      setForm(EMPTY_FORM);
      setNotice({ tone: "success", message: "Đã thêm sản phẩm mới" });
      reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    setDeletingId(product.id);
    setNotice(null);
    try {
      await productsApi.remove(product.id);
      setNotice({ tone: "success", message: `Đã xoá sản phẩm ${product.code}` });
      reload();
    } catch (err) {
      setNotice({ tone: "error", message: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Sản phẩm & Hàng hóa"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Thêm sản phẩm
          </Button>
        }
      />

      <Notice tone={notice?.tone} message={notice?.message} onClose={() => setNotice(null)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tổng SKU" value={products.length} currency={false} unit="SKU" />
        <StatCard label="Giá trị hàng hóa theo giá vốn" value={totalValue} />
        <StatCard
          label="Biên lợi nhuận gộp trung bình"
          value={0}
          currency={false}
          hint={pct(avgMargin)}
        />
      </div>

      <Panel
        className="mt-5"
        title="Danh mục hàng hóa"
        description="Nhấn mã vạch để sao chép nhanh cho máy in tem"
        bodyClassName="p-0"
        actions={
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, mã, barcode…"
              className="w-56 pl-9"
            />
          </div>
        }
      >
        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <ErrorBlock message={error} onRetry={reload} />
        ) : (
          <DataTable
            head={[
              "Mã",
              "Tên hàng",
              "ĐVT",
              "Mã vạch",
              "Giá vốn BQ",
              "Giá bán",
              "Biên LN",
              "Tồn / Min",
              "Trạng thái",
              "",
            ]}
          >
            {filtered.length === 0 ? (
              <EmptyRow
                colSpan={10}
                message="Chưa có sản phẩm nào"
                hint="Thêm sản phẩm để bắt đầu lập phiếu nhập kho."
              />
            ) : (
              filtered.map((product) => {
                const margin =
                  product.sellingPrice > 0
                    ? ((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100
                    : 0;
                const low = product.currentStock <= product.minStock;

                return (
                  <tr key={product.id} className="hover:bg-muted/50">
                    <Td className="font-semibold text-primary">{product.code}</Td>
                    <Td className="max-w-[260px]">
                      <p className="truncate font-medium">{product.name}</p>
                    </Td>
                    <Td className="text-muted-foreground">{product.unit}</Td>
                    <Td>
                      {product.barcode ? (
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(product.barcode)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs transition-colors hover:bg-secondary"
                          title="Sao chép mã vạch"
                        >
                          <QrCode className="size-3.5" /> {product.barcode}
                          <Copy className="size-3 text-muted-foreground" />
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </Td>
                    <Td className="num">{vnd(product.costPrice)}</Td>
                    <Td className="num font-semibold">{vnd(product.sellingPrice)}</Td>
                    <Td>
                      <Pill tone={margin >= 20 ? "success" : margin >= 12 ? "gold" : "warning"}>
                        {pct(margin)}
                      </Pill>
                    </Td>
                    <Td className={low ? "num font-semibold text-destructive" : "num"}>
                      {num(product.currentStock)} / {num(product.minStock)}
                    </Td>
                    <Td>
                      <Pill tone={product.status === "active" ? "success" : "muted"}>
                        {product.status === "active" ? "Đang bán" : "Ngừng bán"}
                      </Pill>
                    </Td>
                    <Td className="text-right">
                      {hasRole("admin") ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Xoá sản phẩm"
                          disabled={deletingId === product.id}
                          onClick={() => handleDelete(product)}
                        >
                          {deletingId === product.id ? (
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
            <DialogTitle>Thêm sản phẩm mới</DialogTitle>
            <DialogDescription>
              Mã sản phẩm (SP1, SP2…) được hệ thống sinh tự động khi lưu.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Tên hàng" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Gạo ST25 túi 5kg"
                required
              />
            </Field>
            <Field label="Đơn vị tính">
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="Túi"
              />
            </Field>
            <Field label="Mã vạch">
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="8938505970026"
              />
            </Field>
            <Field label="Giá vốn (VNĐ)">
              <Input
                type="number"
                min="0"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                placeholder="148000"
                required
              />
            </Field>
            <Field label="Giá bán (VNĐ)">
              <Input
                type="number"
                min="0"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                placeholder="189000"
                required
              />
            </Field>
            <Field label="Tồn kho tối thiểu">
              <Input
                type="number"
                min="0"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="20"
              />
            </Field>
            <Field label="Mô tả">
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ghi chú thêm"
              />
            </Field>

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {saving ? "Đang lưu…" : "Lưu sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
