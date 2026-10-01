// Động cơ tính thuế Việt Nam: thuế khoán hộ kinh doanh, GTGT khấu trừ, TNDN.
const express = require('express');

const TaxRecord = require('../models/taxRecord');
const Salary = require('../models/salary');
const { TaxType, TaxPeriodType, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, firstDayOfMonth, lastDayOfMonth } = require('../lib/helpers');
const { salesRevenue, salesVat, salesCogs, purchaseVat } = require('../lib/aggregate');
const { computeHouseholdTax, computeCit, computeVat } = require('../lib/tax');

const router = express.Router();
router.use(authenticate);
router.use(authorize(RoleName.ADMIN, RoleName.ACCOUNTANT));

/** Tổng lương đã chi trả thực tế trong năm từ bảng lương. */
async function totalSalaryPaid(year) {
  const [row] = await Salary.aggregate([
    { $match: { year } },
    { $group: { _id: null, total: { $sum: '$netSalary' } } },
  ]);
  return row ? row.total : 0;
}

// ============ THUẾ KHOÁN HỘ KINH DOANH ============
router.post(
  '/household',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['year', 'month']);
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const businessType = req.body.businessType || 'wholesale_retail';

    const startDate = firstDayOfMonth(year, month);
    const endDate = lastDayOfMonth(year, month);

    const { grandTotal: totalRevenue } = await salesRevenue(startDate, endDate);

    const { rates, vatAmount, pitAmount, totalTax } = computeHouseholdTax({
      totalRevenue,
      businessType,
    });

    await TaxRecord.create({
      taxType: TaxType.KHOAN_TAX_REVENUE,
      periodType: TaxPeriodType.MONTHLY,
      year,
      month,
      totalRevenue,
      taxRate: rates.total,
      taxAmount: totalTax,
      vatPayable: vatAmount,
      notes: `Thuế khoán - ${rates.label} (${rates.vat}% GTGT + ${rates.pit}% TNCN)`,
    });

    res.json({
      period: `Tháng ${month}/${year}`,
      businessType: rates.label,
      totalRevenue,
      vatRate: rates.vat,
      vatAmount,
      pitRate: rates.pit,
      pitAmount,
      totalTax: vatAmount + pitAmount,
      effectiveRate: rates.total,
    });
  }),
);

// ============ THUẾ GTGT (PHƯƠNG PHÁP KHẤU TRỪ) ============
router.post(
  '/vat',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['year', 'quarter']);
    const year = Number(req.body.year);
    const quarter = Number(req.body.quarter);

    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const startDate = firstDayOfMonth(year, startMonth);
    const endDate = lastDayOfMonth(year, endMonth);

    const { vatOutput } = await salesVat(startDate, endDate);
    const { vatInput } = await purchaseVat(startDate, endDate);
    const { vatPayable } = computeVat({ vatOutput, vatInput });

    await TaxRecord.create([
      {
        taxType: TaxType.VAT_OUTPUT,
        periodType: TaxPeriodType.QUARTERLY,
        year,
        quarter,
        vatOutput,
        taxAmount: vatOutput,
        notes: `Thuế GTGT đầu ra Q${quarter}/${year}`,
      },
      {
        taxType: TaxType.VAT_INPUT,
        periodType: TaxPeriodType.QUARTERLY,
        year,
        quarter,
        vatInput,
        taxAmount: vatInput,
        notes: `Thuế GTGT đầu vào Q${quarter}/${year}`,
      },
      {
        taxType: TaxType.VAT_PAYABLE,
        periodType: TaxPeriodType.QUARTERLY,
        year,
        quarter,
        vatOutput,
        vatInput,
        vatPayable,
        taxAmount: vatPayable,
        notes: `Thuế GTGT phải nộp Q${quarter}/${year}`,
      },
    ]);

    res.json({
      period: `Quý ${quarter}/${year}`,
      vatOutput,
      vatInput,
      vatPayable,
      formula: `Thuế GTGT phải nộp = ${vatOutput.toLocaleString('vi-VN')} - ${vatInput.toLocaleString('vi-VN')} = ${vatPayable.toLocaleString('vi-VN')} VNĐ`,
    });
  }),
);

// ============ THUẾ TNDN ============
router.post(
  '/cit',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['year']);
    const year = Number(req.body.year);

    const startDate = `${year}-01-01`;
    const endDate = lastDayOfMonth(year, 12);

    const { grandTotal: totalRevenue } = await salesRevenue(startDate, endDate);
    const { cogs } = await salesCogs(startDate, endDate);
    const totalSalary = await totalSalaryPaid(year);

    // Dùng chung động cơ thuế với báo cáo để tránh lệch số.
    const { taxableIncome: effectiveTaxableIncome, tier, citAmount } = computeCit({
      totalRevenue,
      cogs: cogs.cogs,
      totalSalary,
    });

    await TaxRecord.create({
      taxType: TaxType.CIT,
      periodType: TaxPeriodType.YEARLY,
      year,
      totalRevenue,
      cogs: cogs.cogs,
      totalSalary,
      taxableIncome: effectiveTaxableIncome,
      taxRate: tier.rate,
      taxAmount: citAmount,
      notes: `Thuế TNDN ${year} - ${tier.label} (${tier.rate}%)`,
    });

    res.json({
      year,
      totalRevenue,
      cogs: cogs.cogs,
      totalSalary,
      taxableIncome: effectiveTaxableIncome,
      taxTier: tier.label,
      taxRate: `${tier.rate}%`,
      citAmount,
      formula: `Thuế TNDN = (${effectiveTaxableIncome.toLocaleString('vi-VN')} × ${tier.rate}%) = ${citAmount.toLocaleString('vi-VN')} VNĐ`,
    });
  }),
);

// ============ LỊCH SỬ KÊ KHAI ============
router.get(
  '/records',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.type) filter.taxType = req.query.type;
    if (req.query.periodType) filter.periodType = req.query.periodType;

    const records = await TaxRecord.find(filter).sort({ year: -1, month: -1, quarter: -1 }).lean();
    res.json(records);
  }),
);

// ============ XUẤT XML KÊ KHAI ============
router.post(
  '/export-xml',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['year', 'quarter']);
    const year = Number(req.body.year);
    const quarter = Number(req.body.quarter);

    const records = await TaxRecord.find({
      year,
      quarter,
      periodType: TaxPeriodType.QUARTERLY,
    });

    const find = (taxType) => records.find((r) => r.taxType === taxType);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TaxDeclaration>
  <Period year="${year}" quarter="${quarter}"/>
  <VATOutput>${find(TaxType.VAT_OUTPUT)?.vatOutput || 0}</VATOutput>
  <VATInput>${find(TaxType.VAT_INPUT)?.vatInput || 0}</VATInput>
  <VATPayable>${find(TaxType.VAT_PAYABLE)?.vatPayable || 0}</VATPayable>
  <CIT>${find(TaxType.CIT)?.taxAmount || 0}</CIT>
  <GeneratedAt>${new Date().toISOString()}</GeneratedAt>
  <System>BizCare v3.0</System>
</TaxDeclaration>`;

    const vatPayableRecord = find(TaxType.VAT_PAYABLE);
    if (vatPayableRecord) {
      vatPayableRecord.xmlData = xml;
      await vatPayableRecord.save();
    }

    res.json({ xml, records: records.map((r) => r.toJSON()) });
  }),
);

module.exports = router;
