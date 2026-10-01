import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Printer } from "lucide-react";

import {
  DataTable,
  EmptyRow,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
  Td,
} from "@/components/page-parts";
import { Button } from "@/components/ui/button";
import { reportsApi } from "@/lib/api";
import { compactVnd, pct, vnd } from "@/lib/format";
import { useResource } from "@/lib/use-resource";

const PERIOD_OPTIONS = [
  { value: "year", label: "Cả năm" },
  { value: "quarter", label: "Theo quý" },
  { value: "month", label: "Theo tháng" },
];

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [mode, setMode] = useState("year");
  const [quarter, setQuarter] = useState(Math.floor(now.getMonth() / 3) + 1);
  const [month, setMonth] = useState(now.getMonth() + 1);

  const params =
    mode === "quarter" ? { year, quarter } : mode === "month" ? { year, month } : { year };

  const { data, loading, error, reload } = useResource(
    () => reportsApi.getPnl(params),
    [mode, year, quarter, month],
  );

  if (loading) return <LoadingBlock label="Đang tổng hợp báo cáo…" />;
  if (error) return <ErrorBlock message={error} onRetry={reload} />;

  const report = data || {};
  const ros = report.netRevenue > 0 ? (report.netProfit / report.netRevenue) * 100 : 0;

  const lines = [
    { no: 1, label: "Tổng doanh thu bán hàng & dịch vụ", value: report.totalRevenue || 0 },
    { no: 2, label: "Các khoản giảm trừ doanh thu", value: -(report.discount || 0) },
    { no: 3, label: "Doanh thu thuần về bán hàng", value: report.netRevenue || 0, strong: true },
    { no: 4, label: "Giá vốn hàng bán (COGS)", value: -(report.cogs || 0) },
    { no: 5, label: "Lợi nhuận gộp về bán hàng", value: report.grossProfit || 0, strong: true },
    { no: 6, label: "Chi phí quản lý & vận hành", value: -(report.operatingExpenses || 0) },
    { no: 7, label: "Thuế TNDN tạm tính", value: -(report.estimatedTax || 0) },
    { no: 8, label: "Lợi nhuận sau thuế", value: report.netProfit || 0, strong: true },
  ];

  const chartData = lines
    .filter((line) => [1, 3, 4, 5, 8].includes(line.no))
    .map((line) => ({ name: `(${line.no})`, value: Math.abs(line.value) }));

  return (
    <>
      <PageHeader
        title="Báo cáo tài chính & Lãi/Lỗ (P&L)"
        description={`Kỳ báo cáo: ${report.period || "—"} · tổng hợp từ phiếu xuất đã xuất kho và phiếu nhập đã nhập kho`}
        actions={
          <>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {mode === "quarter" ? (
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>
                    Quý {q}
                  </option>
                ))}
              </select>
            ) : null}

            {mode === "month" ? (
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-lg border border-border bg-card px-3 text-sm"
            >
              {[year - 2, year - 1, year, year + 1].map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>

            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" /> In / Xuất PDF
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Doanh thu thuần" value={report.netRevenue || 0} />
        <StatCard label="Lợi nhuận gộp" value={report.grossProfit || 0} />
        <StatCard label="Lợi nhuận sau thuế" value={report.netProfit || 0} />
        <StatCard
          label="Tỷ suất sinh lời (ROS)"
          value={0}
          currency={false}
          hint={pct(ros)}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Panel
          className="xl:col-span-3"
          title="Kết quả hoạt động kinh doanh"
          description="8 chỉ tiêu chuẩn"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li
                key={line.no}
                className={
                  line.strong
                    ? "flex items-center justify-between gap-4 bg-secondary/70 px-5 py-3"
                    : "flex items-center justify-between gap-4 px-5 py-3"
                }
              >
                <span className="flex items-center gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                    {line.no}
                  </span>
                  <span className={line.strong ? "font-display font-semibold" : ""}>
                    {line.label}
                  </span>
                </span>
                <span
                  className={
                    line.value < 0
                      ? "num text-sm font-medium text-destructive"
                      : line.strong
                        ? "num font-display text-base font-bold text-primary"
                        : "num text-sm font-medium"
                  }
                >
                  {vnd(line.value)}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="xl:col-span-2" title="Cơ cấu tài chính" description="Quy mô các chỉ tiêu chính">
          {chartData.every((item) => item.value === 0) ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Chưa có chứng từ nào trong kỳ để vẽ biểu đồ.
            </p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -8, right: 8, top: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
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
                    width={62}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(value) => vnd(value)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid oklch(var(--border))",
                      background: "oklch(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="oklch(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-3 rounded-xl gradient-gold p-4 text-gold-foreground">
            <p className="text-xs font-medium opacity-80">
              Tỷ suất lợi nhuận trên doanh thu (ROS)
            </p>
            <p className="font-display text-2xl font-bold">{pct(ros)}</p>
            <p className="text-xs opacity-90">
              Mỗi 100đ doanh thu tạo ra {ros.toFixed(1)}đ lãi ròng
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel
          title="Doanh thu theo sản phẩm"
          description="Top sản phẩm theo doanh thu thuần trong kỳ"
          bodyClassName="p-0"
        >
          <DataTable head={["Mã SP", "Tên sản phẩm", "Số lượng", "Doanh thu"]}>
            {(report.revenueBreakdown || []).length === 0 ? (
              <EmptyRow colSpan={4} message="Chưa có dữ liệu bán hàng trong kỳ" />
            ) : (
              report.revenueBreakdown.slice(0, 8).map((row) => (
                <tr key={row.productCode || row.productName} className="hover:bg-muted/50">
                  <Td className="font-mono text-xs font-semibold text-primary">
                    {row.productCode}
                  </Td>
                  <Td className="font-medium">{row.productName}</Td>
                  <Td className="num">{row.quantity}</Td>
                  <Td className="num font-semibold">{vnd(row.totalRevenue)}</Td>
                </tr>
              ))
            )}
          </DataTable>
        </Panel>

        <Panel
          title="Giá vốn theo sản phẩm"
          description="Chi phí mua vào ghi nhận theo phiếu nhập đã nhập kho"
          bodyClassName="p-0"
        >
          <DataTable head={["Mã SP", "Tên sản phẩm", "Số lượng", "Giá vốn"]}>
            {(report.costBreakdown || []).length === 0 ? (
              <EmptyRow colSpan={4} message="Chưa có dữ liệu nhập kho trong kỳ" />
            ) : (
              report.costBreakdown.slice(0, 8).map((row) => (
                <tr key={row.productCode || row.productName} className="hover:bg-muted/50">
                  <Td className="font-mono text-xs font-semibold text-primary">
                    {row.productCode}
                  </Td>
                  <Td className="font-medium">{row.productName}</Td>
                  <Td className="num">{row.quantity}</Td>
                  <Td className="num font-semibold">{vnd(row.totalCost)}</Td>
                </tr>
              ))
            )}
          </DataTable>
        </Panel>
      </div>
    </>
  );
}
