// Tồn kho & lịch sử xuất nhập kho.
// Mọi bản ghi lịch sử đều sinh ra từ thao tác thật (nhập kho / xuất kho / kiểm kê),
// không có dữ liệu nào được chèn sẵn từ code.
const express = require('express');

const InventoryLog = require('../models/inventoryLog');
const Product = require('../models/product');
const {
  InventoryLogType,
  ProductStatus,
  RoleName,
} = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, toNumber } = require('../lib/helpers');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

/** Dựng điều kiện lọc theo khoảng ngày (createdAt) từ chuỗi YYYY-MM-DD. */
function buildDateFilter(from, to) {
  const filter = {};
  if (from) filter.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) filter.$lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// ============ TỔNG QUAN TỒN KHO ============
router.get(
  '/summary',
  authorize(RoleName.ADMIN, RoleName.WAREHOUSE, RoleName.ACCOUNTANT),
  asyncHandler(async (_req, res) => {
    const products = await Product.find().sort({ name: 1 });

    res.json(
      products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        unit: p.unit,
        currentStock: p.currentStock,
        minStock: p.minStock,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        stockValue: p.currentStock * p.costPrice,
        isLowStock: p.currentStock <= p.minStock,
      })),
    );
  }),
);

// ============ LỊCH SỬ XUẤT NHẬP KHO (TOÀN BỘ) ============
// Dùng cho bảng "Lịch sử biến động thẻ kho" — lấy dữ liệu thật từ mọi phiếu nhập/xuất/kiểm kê.
router.get(
  '/logs',
  authorize(RoleName.ADMIN, RoleName.WAREHOUSE, RoleName.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const { type, productId, from, to, limit } = req.query;

    const filter = {};
    if (type) {
      if (!Object.values(InventoryLogType).includes(type)) {
        throw badRequest('Loại giao dịch kho không hợp lệ');
      }
      filter.type = type;
    }
    if (productId) filter.productId = Number(productId);

    const createdAt = buildDateFilter(from, to);
    if (createdAt) filter.createdAt = createdAt;

    const take = Math.min(toNumber(limit) || 200, 1000);

    const logs = await InventoryLog.find(filter)
      .populate('product')
      .sort({ createdAt: -1, id: -1 })
      .limit(take);

    res.json(logs.map((log) => log.toJSON()));
  }),
);

// ============ LỊCH SỬ THEO MỘT SẢN PHẨM ============
router.get(
  '/logs/:productId',
  authorize(RoleName.ADMIN, RoleName.WAREHOUSE, RoleName.ACCOUNTANT),
  asyncHandler(async (req, res) => {
    const filter = { productId: Number(req.params.productId) };

    if (req.query.type) filter.type = req.query.type;

    const createdAt = buildDateFilter(req.query.from, req.query.to);
    if (createdAt) filter.createdAt = createdAt;

    const logs = await InventoryLog.find(filter)
      .populate('product')
      .sort({ createdAt: -1, id: -1 });

    res.json(logs.map((log) => log.toJSON()));
  }),
);

// ============ ĐIỀU CHỈNH TỒN KHO THỦ CÔNG (KIỂM KÊ) ============
router.post(
  '/adjust',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['productId', 'adjustment']);
    const { productId, adjustment, notes } = req.body;

    const product = await Product.findOne({ id: Number(productId) });
    if (!product) throw notFound('Sản phẩm không tồn tại');

    const delta = Number(adjustment);
    if (!Number.isFinite(delta) || delta === 0) {
      throw badRequest('Số lượng điều chỉnh phải là số khác 0');
    }

    const stockBefore = product.currentStock;
    product.currentStock += delta;

    if (product.currentStock < 0) {
      throw badRequest('Tồn kho không thể âm');
    }

    await product.save();

    const log = await InventoryLog.create({
      productId: product.id,
      type: InventoryLogType.ADJUSTMENT,
      quantity: delta,
      stockBefore,
      stockAfter: product.currentStock,
      referenceType: 'manual_adjustment',
      referenceCode: null,
      notes: notes || 'Điều chỉnh tồn kho thủ công',
      createdBy: req.user.id,
    });

    res.json({
      message: 'Điều chỉnh tồn kho thành công',
      product: product.toJSON(),
      log: log.toJSON(),
    });
  }),
);

// ============ CẢNH BÁO TỒN KHO THẤP ============
router.get(
  '/low-stock',
  authorize(RoleName.ADMIN, RoleName.WAREHOUSE, RoleName.ACCOUNTANT),
  asyncHandler(async (_req, res) => {
    const products = await Product.find({
      status: ProductStatus.ACTIVE,
      $expr: { $lte: ['$currentStock', '$minStock'] },
    }).sort({ currentStock: 1 });

    res.json({
      count: products.length,
      products: products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        currentStock: p.currentStock,
        minStock: p.minStock,
      })),
    });
  }),
);

module.exports = router;
