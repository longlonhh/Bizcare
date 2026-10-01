// Quản lý hàng hoá / sản phẩm.
const express = require('express');

const Product = require('../models/product');
const SalesOrder = require('../models/salesOrder');
const PurchaseOrder = require('../models/purchaseOrder');
const { RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, maxCodeNumber } = require('../lib/helpers');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.WAREHOUSE);

/** Tìm sản phẩm theo id số, báo lỗi 404 nếu không có. */
async function findOrFail(id) {
  const product = await Product.findOne({ id });
  if (!product) throw notFound('Không tìm thấy sản phẩm');
  return product;
}

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'costPrice', 'sellingPrice']);
    const { name, unit, barcode, costPrice, sellingPrice, description, minStock } = req.body;

    // Sinh mã SP: SP1, SP2, SP3... (tối ưu: chỉ lấy bản ghi cuối)
    const lastProduct = await Product.findOne().sort({ id: -1 });
    const code = `SP${maxCodeNumber([lastProduct?.code || 'SP0'], 'SP') + 1}`;

    const product = await Product.create({
      code,
      name,
      unit: unit || 'cái',
      barcode: barcode || null,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      minStock: Number(minStock) || 0,
      description: description || null,
    });

    res.status(201).json({ message: 'Tạo sản phẩm thành công', product: product.toJSON() });
  }),
);

router.get(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      const keyword = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { code: { $regex: keyword, $options: 'i' } },
        { barcode: { $regex: keyword, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    res.json(products);
  }),
);

router.get(
  '/barcode/:barcode',
  canManage,
  asyncHandler(async (req, res) => {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) throw notFound('Không tìm thấy sản phẩm với mã vạch này');
    res.json(product);
  }),
);

router.get(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    res.json(await findOrFail(Number(req.params.id)));
  }),
);

router.put(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    const product = await findOrFail(Number(req.params.id));
    const { name, unit, barcode, costPrice, sellingPrice, description, status, minStock } =
      req.body;

    if (name !== undefined) product.name = name;
    if (unit !== undefined) product.unit = unit;
    if (barcode !== undefined) product.barcode = barcode || null;
    if (costPrice !== undefined) product.costPrice = Number(costPrice) || 0;
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice) || 0;
    if (minStock !== undefined) product.minStock = Number(minStock) || 0;
    if (description !== undefined) product.description = description || null;
    if (status !== undefined) product.status = status;

    await product.save();
    res.json({ message: 'Cập nhật sản phẩm thành công', product });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const product = await findOrFail(Number(req.params.id));

    // Safe Delete: Không xóa nếu đã có đơn bán hoặc đơn nhập liên kết
    const usedInSales = await SalesOrder.findOne({ items: { $elemMatch: { productId: product.id } } });
    if (usedInSales) {
      throw badRequest('Không thể xóa sản phẩm vì đã phát sinh trong Phiếu Xuất kho. Vui lòng đổi trạng thái ngưng hoạt động.');
    }
    const usedInPurchase = await PurchaseOrder.findOne({ items: { $elemMatch: { productId: product.id } } });
    if (usedInPurchase) {
      throw badRequest('Không thể xóa sản phẩm vì đã phát sinh trong Phiếu Nhập kho. Vui lòng đổi trạng thái ngưng hoạt động.');
    }

    await product.deleteOne();
    res.json({ message: 'Đã xóa sản phẩm' });
  }),
);

module.exports = router;
