// Động cơ tính thuế dùng chung cho cả phân hệ Thuế (routes/tax.js) và Báo cáo (routes/reports.js).
// Mục tiêu: chỉ có MỘT nguồn công thức duy nhất, tránh hai nơi tính ra hai số khác nhau.

// Hộ kinh doanh: thuế khoán theo doanh thu (Thông tư 40/2021/TT-BTC)
const HO_KINH_DOANH_RATES = {
  wholesale_retail: {
    label: 'Phân phối, bán buôn/bán lẻ',
    vat: 1.0,
    pit: 0.5,
    total: 1.5,
  },
  manufacturing_transport: {
    label: 'Sản xuất, vận tải, dịch vụ gắn hàng hóa',
    vat: 3.0,
    pit: 1.5,
    total: 4.5,
  },
  services_construction: {
    label: 'Dịch vụ, xây dựng',
    vat: 5.0,
    pit: 2.0,
    total: 7.0,
  },
};

// DN SMEs: thuế suất TNDN theo quy mô doanh thu
const CIT_RATES = [
  { maxRevenue: 3_000_000_000, rate: 15, label: 'Doanh thu < 3 tỷ' },
  { maxRevenue: 50_000_000_000, rate: 17, label: 'Doanh thu 3-50 tỷ' },
  { maxRevenue: Infinity, rate: 20, label: 'Doanh thu > 50 tỷ' },
];

/** Chọn mức thuế suất TNDN theo tổng doanh thu. */
function resolveCitTier(totalRevenue) {
  return CIT_RATES.find((r) => totalRevenue <= r.maxRevenue) || CIT_RATES[CIT_RATES.length - 1];
}

/**
 * Tính thuế TNDN.
 * Thu nhập chịu thuế = Doanh thu thuần - COGS thực tế - Chi phí lương hợp lý.
 */
function computeCit({ totalRevenue = 0, cogs = 0, totalSalary = 0 }) {
  const taxableIncome = Math.max(0, totalRevenue - cogs - totalSalary);
  const tier = resolveCitTier(totalRevenue);
  const citAmount = taxableIncome * (tier.rate / 100);
  return { taxableIncome, tier, citAmount };
}

/** Tính thuế khoán hộ kinh doanh theo doanh thu. */
function computeHouseholdTax({ totalRevenue = 0, businessType = 'wholesale_retail' }) {
  const rates = HO_KINH_DOANH_RATES[businessType] || HO_KINH_DOANH_RATES.wholesale_retail;
  const vatAmount = totalRevenue * (rates.vat / 100);
  const pitAmount = totalRevenue * (rates.pit / 100);
  return { rates, vatAmount, pitAmount, totalTax: vatAmount + pitAmount };
}

/** Tính thuế GTGT phải nộp theo phương pháp khấu trừ. */
function computeVat({ vatOutput = 0, vatInput = 0 }) {
  return { vatOutput, vatInput, vatPayable: Math.max(0, vatOutput - vatInput) };
}

module.exports = {
  HO_KINH_DOANH_RATES,
  CIT_RATES,
  resolveCitTier,
  computeCit,
  computeHouseholdTax,
  computeVat,
};