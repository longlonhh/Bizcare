// Báo cáo tài chính P&L và tổng quan dashboard.
const express = require('express');

const SalesOrder = require('../models/salesOrder');
const PurchaseOrder = require('../models/purchaseOrder');
const Product = require('../models/product');
const Salary = require('../models/salary');
const { SalesOrderStatus, PurchaseOrderStatus, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, lastDayOfMonth, todayISO } = require('../lib/helpers');
const {
  salesRevenue,
  salesCogs,
  revenueByProduct,
  costByProduct,
} = require('../lib/aggregate');
const { computeCit } = require('../lib/tax');

const router = express.Router();
router.use(authenticate);

// Báo cáo P&L chỉ dành cho Admin/Kế toán.
const financeOnly = authorize(RoleName.ADMIN, RoleName.ACCOUNTANT);

/** Xác định khoảng ngày và nhãn kỳ báo cáo từ query. */
function resolvePeriod(query) {
  const now = new Date();
  const year = Number(query.year) || now.getFullYear();

  if (query.fromDate && query.toDate) {
    return {
      from: query.fromDate,
      to: query.toDate,
      label: `${query.fromDate} - ${query.toDate}`,
    };
  }
  if (query.month) {
    const month = Number(query.month);
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: lastDayOfMonth(year, month),
      label: `Tháng ${month}/${year}`,
    };
  }
  if (query.quarter) {
    const quarter = Number(query.quarter);
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    return {
      from: `${year}-${String(startMonth).padStart(2, '0')}-01`,
      to: lastDayOfMonth(year, endMonth),
      label: `Quý ${quarter}/${year}`,
    };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31`, label: `Năm ${year}` };
}

/** Tổng lương đã chi trả trong khoảng thời gian từ dữ liệu bảng lương thực tế. */
async function salaryExpenses(fromDate, toDate) {
  const fromYear = new Date(fromDate).getFullYear();
  const fromMonth = new Date(fromDate).getMonth() + 1;
  const toYear = new Date(toDate).getFullYear();
  const toMonth = new Date(toDate).getMonth() + 1;

  const [row] = await Salary.aggregate([
    {
      $match: {
        $or: [
          {
            year: { $gt: fromYear, $lt: toYear },
          },
          {
            year: fromYear,
            month: { $gte: fromMonth },
          },
          {
            year: toYear,
            month: { $lte: toMonth },
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        totalSalary: { $sum: '$netSalary' },
        count: { $sum: 1 },
      },
    },
  ]);

  return { totalSalary: row?.totalSalary || 0, count: row?.count || 0 };
}

// ============ BÁO CÁO LÃI/LỖ (P&L) ============
router.get(
  '/pnl',
  financeOnly,
  asyncHandler(async (req, res) => {
    const period = resolvePeriod(req.query);

    const { totalRevenue, totalDiscount } = await salesRevenue(period.from, period.to);
    // COGS chính xác = Σ(quantity × costPrice) từ các đơn xuất kho đã hoàn thành
    const { cogs } = await salesCogs(period.from, period.to);

    const [revenueBreakdown, costBreakdown, salary] = await Promise.all([
      revenueByProduct(period.from, period.to),
      costByProduct(period.from, period.to),
      salaryExpenses(period.from, period.to),
    ]);

    const netRevenue = totalRevenue - totalDiscount;
    const grossProfit = netRevenue - cogs;

    // Chi phí lương thực tế từ phân hệ nhân sự
    const operatingExpenses = salary.totalSalary;

    // Dùng chung động cơ thuế với phân hệ Thuế để tránh lệch số.
    // Thu nhập chịu thuế = Doanh thu thuần - COGS - Chi phí lương.
    const { citAmount: estimatedTax } = computeCit({
      totalRevenue: netRevenue,
      cogs,
      totalSalary: operatingExpenses,
    });

    const operatingProfit = grossProfit - operatingExpenses;
    const netProfit = operatingProfit - estimatedTax;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    res.json({
      period: period.label,
      fromDate: period.from,
      toDate: period.to,
      totalRevenue,
      discount: totalDiscount,
      netRevenue,
      cogs,
      grossProfit,
      operatingExpenses,
      salaryCount: salary.count,
      estimatedTax,
      netProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      costBreakdown,
      revenueBreakdown,
    });
  }),
);

// ============ TỔNG QUAN DASHBOARD ============
// Mọi vai trò đã đăng nhập đều mở được trang chủ, nên endpoint này không giới hạn thêm.
router.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const year = now.getFullYear();

    const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = lastDayOfMonth(year, now.getMonth() + 1);

    const [monthly, yearly] = await Promise.all([
      salesRevenue(monthStart, monthEnd),
      salesRevenue(`${year}-01-01`, `${year}-12-31`),
    ]);

    // Chuỗi doanh thu & giá vốn theo tháng để vẽ biểu đồ bằng dữ liệu thật.
    const [revenueRows, purchaseRows] = await Promise.all([
      SalesOrder.aggregate([
        {
          $match: {
            status: SalesOrderStatus.COMPLETED,
            exportDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
          },
        },
        {
          $group: {
            _id: { $substrBytes: ['$exportDate', 5, 2] },
            revenue: { $sum: '$totalAmount' },
          },
        },
      ]),
      PurchaseOrder.aggregate([
        {
          $match: {
            status: PurchaseOrderStatus.RECEIVED,
            importDate: { $gte: `${year}-01-01`, $lte: `${year}-12-31` },
          },
        },
        {
          $group: {
            _id: { $substrBytes: ['$importDate', 5, 2] },
            cogs: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    const revenueByMonth = new Map(revenueRows.map((r) => [r._id, r.revenue]));
    const cogsByMonth = new Map(purchaseRows.map((r) => [r._id, r.cogs]));

    const monthlySeries = Array.from({ length: 12 }, (_, i) => {
      const key = String(i + 1).padStart(2, '0');
      return {
        month: `T${i + 1}`,
        revenue: revenueByMonth.get(key) || 0,
        cogs: cogsByMonth.get(key) || 0,
      };
    });

    // Số liệu phục vụ thẻ KPI trên dashboard
    const [pendingPurchaseOrders, pendingSalesOrders, productStats] = await Promise.all([
      PurchaseOrder.countDocuments({
        status: {
          $in: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CONFIRMED],
        },
      }),
      SalesOrder.countDocuments({
        status: { $in: [SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED] },
      }),
      // Tính stockValue và lowStockCount bằng aggregate (đúng, gọn, không tải toàn bộ product)
      Product.aggregate([
        {
          $project: {
            stockValue: { $multiply: ['$currentStock', '$costPrice'] },
            isLowStock: { $lte: ['$currentStock', '$minStock'] },
          },
        },
        {
          $group: {
            _id: null,
            totalStockValue: { $sum: '$stockValue' },
            lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } },
          },
        },
      ]),
    ]);

    const aggregateResult = productStats[0] || { totalStockValue: 0, lowStockCount: 0 };
    const finalLowStockCount = aggregateResult.lowStockCount || 0;
    const finalStockValue = aggregateResult.totalStockValue || 0;

    res.json({
      month: now.getMonth() + 1,
      year,
      today: todayISO(),
      monthlyRevenue: monthly.grandTotal,
      yearlyRevenue: yearly.grandTotal,
      monthlyOrderCount: monthly.orderCount,
      yearlyOrderCount: yearly.orderCount,
      monthlySeries,
      pendingPurchaseOrders,
      pendingSalesOrders,
      productCount: 0, // cần query riêng nếu cần, nhưng không cần thiết cho dashboard
      stockValue: finalStockValue,
      lowStockCount: finalLowStockCount,
    });
  }),
);

module.exports = router;
