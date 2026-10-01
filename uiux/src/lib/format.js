export const vnd = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const num = (n) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0);

export const compactVnd = (n) => {
  const value = Number(n) || 0;
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return num(value);
};

export const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;

/** Ngày dạng YYYY-MM-DD (hoặc ISO) sang dd/mm/yyyy. */
export const dateVN = (value) => {
  if (!value) return "—";
  const iso = String(value).slice(0, 10);
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
};

/** Ngày giờ dạng dd/mm/yyyy HH:mm. */
export const dateTimeVN = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return dateVN(value);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${dateVN(d.toISOString())} ${time}`;
};

/** Hôm nay dạng YYYY-MM-DD theo giờ Việt Nam. */
export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

/** Chuỗi YYYY-MM của tháng hiện tại. */
export const currentMonthValue = () => todayISO().slice(0, 7);

/** Tách { year, month } từ chuỗi YYYY-MM. */
export const parseMonthValue = (value) => {
  const [year, month] = String(value || "").split("-");
  return { year: Number(year), month: Number(month) };
};
