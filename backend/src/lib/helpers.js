// Các hàm dùng chung: bọc async handler, đọc tham số, sinh mã chứng từ.
const { badRequest } = require('./errors');

/** Bọc route handler async để lỗi tự chảy về middleware xử lý lỗi. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Đọc số từ query string, trả undefined nếu không hợp lệ. */
function toNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Bắt buộc các trường có mặt và không rỗng. */
function requireFields(body, fields) {
  const missing = fields.filter((f) => {
    const v = body?.[f];
    return v === undefined || v === null || v === '';
  });
  if (missing.length > 0) {
    throw badRequest(`Thiếu thông tin bắt buộc: ${missing.join(', ')}`);
  }
}

/** Ngày đầu tháng, dạng YYYY-MM-DD. */
function firstDayOfMonth(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

/** Ngày cuối tháng, dạng YYYY-MM-DD. */
function lastDayOfMonth(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

/** Vùng ngày [from, to] theo dạng chuỗi YYYY-MM-DD (so sánh chuỗi là đủ vì đã cố định độ dài). */
function dateRange(from, to) {
  if (!from && !to) return undefined;
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return range;
}

/** Sinh mã chứng từ theo bộ đếm, ví dụ PN000001. */
function formatCode(prefix, seq) {
  return `${prefix}${String(seq).padStart(6, '0')}`;
}

/** Tìm số lớn nhất trong các mã dạng <tiền tố><số>, ví dụ SP12 -> 12. */
function maxCodeNumber(codes, prefix) {
  let max = 0;
  for (const code of codes) {
    if (!code || !code.startsWith(prefix)) continue;
    const match = String(code).match(/\d+/);
    if (!match) continue;
    const num = parseInt(match[0], 10);
    if (num > max) max = num;
  }
  return max;
}

/** Loại bỏ password khỏi object trả về. */
function sanitizeUser(user) {
  if (!user) return user;
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete plain.password;
  return plain;
}

module.exports = {
  asyncHandler,
  toNumber,
  requireFields,
  firstDayOfMonth,
  lastDayOfMonth,
  todayISO,
  dateRange,
  formatCode,
  maxCodeNumber,
  sanitizeUser,
};
