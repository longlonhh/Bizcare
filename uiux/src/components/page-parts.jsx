import { AlertTriangle, Inbox, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { num, vnd } from "@/lib/format";

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, bodyClassName }) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold">{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, delta, currency = true, unit, icon }) {
  const up = (delta ?? 0) >= 0;
  const display = currency ? vnd(value) : `${num(value)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span className="grid size-9 place-items-center rounded-lg bg-secondary text-primary">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="num mt-3 font-display text-2xl font-bold tracking-tight">{display}</p>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta !== undefined && delta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {up ? "+" : ""}
            {Number(delta).toFixed(1)}%
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

const toneMap = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  info: "bg-info/12 text-info border-info/25",
  muted: "bg-muted text-muted-foreground border-border",
  gold: "bg-gold/18 text-gold-foreground border-gold/40",
  primary: "bg-primary/12 text-primary border-primary/25",
};

export function Pill({ tone = "muted", children, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        toneMap[tone] || toneMap.muted,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataTable({ head, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-5 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
}

/** Trạng thái đang tải dữ liệu. */
export function LoadingBlock({ label = "Đang tải dữ liệu…", className }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-16", className)}>
      <Loader2 className="size-5 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Trạng thái lỗi kèm nút thử lại. */
export function ErrorBlock({ message, onRetry, className }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 py-12 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">Không tải được dữ liệu</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary"
        >
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

/** Một dòng trống trong bảng, kèm thông điệp hướng dẫn. */
export function EmptyRow({ colSpan, message = "Chưa có dữ liệu", hint }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="size-5" />
          </span>
          <p className="text-sm font-semibold">{message}</p>
          {hint ? <p className="max-w-md text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </td>
    </tr>
  );
}

/** Ô nhập liệu có nhãn, dùng cho các biểu mẫu. */
export function Field({ label, hint, children, className }) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/** Thông báo kết quả thao tác (thành công / lỗi). */
export function Notice({ tone = "success", message, onClose }) {
  if (!message) return null;
  const styles =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-success/30 bg-success/10 text-success";

  return (
    <div
      className={cn(
        "mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        styles,
      )}
    >
      <span className="font-medium">{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} className="text-xs opacity-70 hover:opacity-100">
          Đóng
        </button>
      ) : null}
    </div>
  );
}
