// Các phép tổng hợp dùng chung cho báo cáo P&L và động cơ tính thuế.
// Ngày lưu dạng chuỗi YYYY-MM-DD nên so sánh khoảng ngày bằng toán tử chuỗi là chính xác.
const SalesOrder = require('../models/salesOrder');
const PurchaseOrder = require('../models/purchaseOrder');
const { SalesOrderStatus, PurchaseOrderStatus } = require('../models/enums');

/** Điều kiện lọc phiếu xuất đã xuất kho trong khoảng ngày. */
const completedSalesMatch = (from, to) => ({
  status: SalesOrderStatus.COMPLETED,
  exportDate: { $gte: from, $lte: to },
});

/** Điều kiện lọc phiếu nhập đã nhập kho trong khoảng ngày. */
const receivedPurchaseMatch = (from, to) => ({
  status: PurchaseOrderStatus.RECEIVED,
  importDate: { $gte: from, $lte: to },
});

/**
 * Tính Giá vốn hàng bán (COGS) chuẩn kế toán:
 * COGS = Σ (quantity × costPrice) của từng dòng hàng trong các phiếu xuất kho đã hoàn thành.
 * costPrice là snapshot giá vốn bình quân gia quyền tại thời điểm xuất kho.
 */
async function salesCogs(from, to) {
  const [row] = await SalesOrder.aggregate([
    { $match: completedSalesMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        cogs: { $sum: { $multiply: ['$items.quantity', { $ifNull: ['$items.costPrice', 0] }] } },
        itemCount: { $sum: 1 },
      },
    },
  ]);
  return row || { cogs: 0, itemCount: 0 };
}

/** Doanh thu bán hàng trong khoảng ngày. */
async function salesRevenue(from, to) {
  const [row] = await SalesOrder.aggregate([
    { $match: completedSalesMatch(from, to) },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalDiscount: { $sum: '$discount' },
        grandTotal: { $sum: '$grandTotal' },
        orderCount: { $sum: 1 },
      },
    },
  ]);

  return row || { totalRevenue: 0, totalDiscount: 0, grandTotal: 0, orderCount: 0 };
}

/** Thuế GTGT đầu ra theo từng dòng hàng bán ra. */
async function salesVat(from, to) {
  const [row] = await SalesOrder.aggregate([
    { $match: completedSalesMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        vatOutput: { $sum: '$items.vatAmount' },
        netAmount: { $sum: '$items.subtotal' },
      },
    },
  ]);

  return row || { vatOutput: 0, netAmount: 0 };
}

/** Tổng giá vốn hàng nhập trong khoảng ngày. */
async function purchaseTotal(from, to) {
  const [row] = await PurchaseOrder.aggregate([
    { $match: receivedPurchaseMatch(from, to) },
    { $group: { _id: null, totalCost: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
  ]);

  return row || { totalCost: 0, orderCount: 0 };
}

/** Thuế GTGT đầu vào theo từng dòng hàng mua vào. */
async function purchaseVat(from, to) {
  const [row] = await PurchaseOrder.aggregate([
    { $match: receivedPurchaseMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: null,
        vatInput: { $sum: '$items.vatAmount' },
        netAmount: { $sum: '$items.subtotal' },
      },
    },
  ]);

  return row || { vatInput: 0, netAmount: 0 };
}

/** Doanh thu theo từng sản phẩm. */
async function revenueByProduct(from, to) {
  return SalesOrder.aggregate([
    { $match: completedSalesMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        quantity: { $sum: '$items.quantity' },
        totalRevenue: { $sum: '$items.subtotal' },
        productName: { $last: '$items.productName' },
        productCode: { $last: '$items.productCode' },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productCode: { $ifNull: ['$product.code', '$productCode'] },
        productName: { $ifNull: ['$product.name', '$productName'] },
        quantity: 1,
        totalRevenue: 1,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);
}

/** Giá vốn theo từng sản phẩm. */
async function costByProduct(from, to) {
  return PurchaseOrder.aggregate([
    { $match: receivedPurchaseMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productId',
        quantity: { $sum: '$items.quantity' },
        totalCost: { $sum: '$items.subtotal' },
        productName: { $last: '$items.productName' },
        productCode: { $last: '$items.productCode' },
      },
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'id',
        as: 'product',
      },
    },
    { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        productCode: { $ifNull: ['$product.code', '$productCode'] },
        productName: { $ifNull: ['$product.name', '$productName'] },
        quantity: 1,
        totalCost: 1,
      },
    },
    { $sort: { totalCost: -1 } },
  ]);
}

/** Doanh thu bán hàng theo 12 tháng của một năm (dùng cho biểu đồ). */
async function monthlyRevenue(year) {
  return SalesOrder.aggregate([
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
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', revenue: 1 } },
  ]);
}

module.exports = {
  completedSalesMatch,
  receivedPurchaseMatch,
  salesRevenue,
  salesVat,
  salesCogs,
  purchaseTotal,
  purchaseVat,
  revenueByProduct,
  costByProduct,
  monthlyRevenue,
};
