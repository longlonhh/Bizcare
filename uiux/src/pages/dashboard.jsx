import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgePercent,
  Banknote,
  Boxes,
  CalendarDays,
  Layers,
  ReceiptText,
  ShoppingCart,
} from "lucide-react";

import {
  DataTable,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Panel,
  Pill,
  StatCard,
  Td,
} from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { compactVnd, dateVN, num, vnd } from "@/lib/format";
import { inventoryApi, reportsApi, salesOrdersApi, taxApi } from "@/lib/api";
import { salesOrderStatus, taxPeriodLabel, taxTypeLabels } from "@/lib/labels";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/use-resource";

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const canSeeFinance = hasRole("admin", "accountant");
  // Tồn kho khoản cho nhân sự không có quyền đọc phân hệ kho.
  const canSeeStock = hasRole("admin", "accountant", "warehouse");

  const dashboard = useResource(() => reportsApi.getDashboard(), []);
  const lowStock = useResource(
    () => (canSeeStock ? inventoryApi.getLowStock() : Promise.resolve({ products: [] })),
    [canSeeStock],
  );
  const recentOrders = useResource(() => salesOrdersApi.getAll(), []);
  const taxRecords = useResource(
    () => (canSeeFinance ? taxApi.getRecords() : Promise.resolve([])),
    [canSeeFinance],
  );

  if (dashboard.loading) return <LoadingBlock label="Đang tải bảng điều khiển…" />;
  if (dashboard.error) return <ErrorBlock message={dashboard.error} onRetry={dashboard.reload} />;

  const d = dashboard.data || {};
  const lowStockItems = lowStock.data?.products || [];
  const orders = (recentOrders.data || []).slice(0, 6);
  const latestTax = (taxRecords.data || []).slice(0, 3);
  const series = (d.monthlySeries || []).filter((row) => row.revenue > 0 || row.cogs > 0);

  const kpis = [
    {
      key: "monthly",
      label: `Doanh thu tháng ${d.month}/${d.year}`,
      value: d.monthlyRevenue || 0,
      hint: `${num(d.monthlyOrderCount || 0)} phiếu xuất đã hoàn tất`,
      icon: <Banknote className="size-4" />,
    },
    {
      key: "yearly",
      label: `Doanh thu năm ${d.year}`,
      value: d.yearlyRevenue || 0,
      hint: `${num(d.yearlyOrderCount || 0)} phiếu xuất lũy kế`,
      icon: <BadgePercent className="size-4" />,
    },
    {
      key: "orders",
      label: "Đơn chờ xuất kho",
      value: d.pendingSalesOrders || 0,
      currency: false,
      unit: "đơn",
      hint: "Phiếu đã xác nhận nhưng chưa xuất kho",
      icon: <ShoppingCart className="size-4" />,
    },
    {
      key: "stock",
      label: "Giá trị tồn kho theo giá vốn",
      value: d.stockValue || 0,
      hint: `${num(d.productCount || 0)} mặt hàng trong hệ thống`,
      icon: <Boxes className="size-4" />,
    },
  ];

  return (
    <>
      <PageHeader
        title={`Chào ${String(user?.fullName || "").split(" ").slice(-1)[0] || ""}, chúc một ngày kinh doanh thuận lợi`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/purchase-orders">
                <Layers className="size-4" /> Tạo phiếu nhập
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/sales-orders">
                <ReceiptText className="size-4" /> Bán hàng nhanh
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            currency={kpi.currency !== false}
            unit={kpi.unit}
            icon={kpi.icon}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Biến động doanh thu & giá vốn"
          description={`Năm ${d.year} · đơn vị VNĐ`}
        >
          {series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Chưa có phiếu xuất kho hoặc phiếu nhập kho nào được xác nhận trong năm nay.
            </p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: -12, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="oklch(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gCogs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(var(--chart-2))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(var(--chart-2))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <YAxis
                    tickFormatter={(value) => compactVnd(Number(value))}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    stroke="oklch(var(--muted-foreground))"
                    width={70}
                  />
                  <Tooltip
                    formatter={(value, name) => [vnd(value), name === "revenue" ? "Doanh thu" : "Giá vốn (COGS)"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(var(--border))",
                      background: "oklch(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="oklch(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#gRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cogs"
                    stroke="oklch(var(--chart-2))"
                    strokeWidth={2}
                    fill="url(#gCogs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-primary" /> Doanh thu
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2.5 rounded-full bg-[oklch(var(--chart-2))]" /> Giá vốn (COGS)
            </span>
          </div>
        </Panel>

        {canSeeStock ? (
        <Panel
          title="Tồn kho dưới ngưỡng an toàn"
          description={`${lowStockItems.length} mặt hàng cần nhập bổ sung`}
          bodyClassName="p-3"
        >
          {lowStock.loading ? (
            <LoadingBlock label="Đang kiểm tra tồn kho…" />
          ) : lowStockItems.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              Mọi mặt hàng đều đang ở mức tồn kho an toàn.
            </p>
          ) : (
            <ul className="space-y-2">
              {lowStockItems.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="num text-xs text-muted-foreground">
                      Còn {num(p.currentStock)} / định mức {num(p.minStock)}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/purchase-orders">Nhập</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        ) : (
          <Panel
            title="Nhịp công việc nhân sự"
            description="Các đầu việc thường gặp trong kỳ"
            bodyClassName="p-3"
          >
            <ul className="space-y-2">
              <li className="flex items-start gap-3 rounded-xl border border-border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Chốt bảng chấm công</p>
                  <p className="text-xs text-muted-foreground">
                    Kiểm tra giờ vào/ra trước khi tính lương kỳ này.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/attendance">Mở</Link>
                </Button>
              </li>
              <li className="flex items-start gap-3 rounded-xl border border-border p-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold-foreground">
                  <Banknote className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Tính lương & chi trả</p>
                  <p className="text-xs text-muted-foreground">
                    Bảng lương được sinh từ dữ liệu chấm công thực tế.
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/salary">Mở</Link>
                </Button>
              </li>
            </ul>
          </Panel>
        )}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Phiếu xuất gần đây"
          description="Lấy trực tiếp từ bán hàng"
          bodyClassName="p-0"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/sales-orders">Xem tất cả</Link>
            </Button>
          }
        >
          {recentOrders.loading ? (
            <LoadingBlock />
          ) : (
            <DataTable
              head={["Mã phiếu", "Ngày", "Khách hàng", "Tiền hàng", "VAT", "Trạng thái"]}
            >
              {orders.length === 0 ? (
                <EmptyRow
                  colSpan={6}
                  message="Chưa có phiếu xuất nào"
                  hint="Tạo phiếu xuất ở Bán hàng & Kho để bắt đầu ghi nhận doanh thu."
                />
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/50">
                    <Td className="font-semibold text-primary">{order.code}</Td>
                    <Td className="text-muted-foreground">{dateVN(order.exportDate)}</Td>
                    <Td>{order.customer?.name || "Khách lẻ"}</Td>
                    <Td className="num">{vnd(order.totalAmount)}</Td>
                    <Td className="num text-muted-foreground">{vnd(order.totalVat)}</Td>
                    <Td>
                      <Pill tone={(salesOrderStatus[order.status] || {}).tone}>
                        {(salesOrderStatus[order.status] || {}).label || order.status}
                      </Pill>
                    </Td>
                  </tr>
                ))
              )}
            </DataTable>
          )}
        </Panel>

        {canSeeFinance ? (
          <Panel
            title="Kê khai thuế gần nhất"
            description="Kết quả các lần tính thuế đã lưu"
            bodyClassName="p-3"
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to="/tax">Mở động cơ thuế</Link>
              </Button>
            }
          >
            {latestTax.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Chưa có bản ghi kê khai thuế nào. Vào phân hệ Động cơ tính thuế để tính kỳ đầu tiên.
              </p>
            ) : (
              <ul className="space-y-2">
                {latestTax.map((record) => (
                  <li key={record.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold leading-snug">
                        {taxTypeLabels[record.taxType] || record.taxType}
                      </p>
                      <Pill tone="info">{taxPeriodLabel(record)}</Pill>
                    </div>
                    <p className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" /> Số thuế
                      </span>
                      <span className="num font-semibold text-foreground">
                        {vnd(record.taxAmount)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Ghi chú vận hành" bodyClassName="p-4">
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                Phiếu nhập cần được xác nhận nhập kho để cập nhật tồn và giá vốn bình quân.
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                Phiếu xuất chỉ trừ tồn kho khi bạn xác nhận xuất kho.
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" />
                Hoá đơn chỉ tạo được từ phiếu xuất đã xuất kho.
              </li>
            </ul>
          </Panel>
        )}
      </div>
    </>
  );
}
