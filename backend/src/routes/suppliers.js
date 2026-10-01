// Quản lý nhà cung cấp.
const express = require('express');

const Supplier = require('../models/supplier');
const PurchaseOrder = require('../models/purchaseOrder');
const { RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, maxCodeNumber } = require('../lib/helpers');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

async function findOrFail(id) {
  const supplier = await Supplier.findOne({ id });
  if (!supplier) throw notFound('Không tìm thấy nhà cung cấp');
  return supplier;
}

router.post(
  '/',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name']);
    const { name, taxCode, phone, email, address, notes } = req.body;

    // Sinh mã NCC: NCC1, NCC2, NCC3... (tối ưu: chỉ lấy bản ghi cuối)
    const lastSupplier = await Supplier.findOne().sort({ id: -1 });
    const code = `NCC${maxCodeNumber([lastSupplier?.code || 'NCC0'], 'NCC') + 1}`;

    const supplier = await Supplier.create({
      code,
      name,
      taxCode: taxCode || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    });

    res.status(201).json({ message: 'Tạo nhà cung cấp thành công', supplier: supplier.toJSON() });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.search) {
      const keyword = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { code: { $regex: keyword, $options: 'i' } },
      ];
    }
    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 }).lean();
    res.json(suppliers);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await findOrFail(Number(req.params.id)));
  }),
);

router.put(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const supplier = await findOrFail(Number(req.params.id));
    const { name, taxCode, phone, email, address, notes } = req.body;

    if (name !== undefined) supplier.name = name;
    if (taxCode !== undefined) supplier.taxCode = taxCode || null;
    if (phone !== undefined) supplier.phone = phone || null;
    if (email !== undefined) supplier.email = email || null;
    if (address !== undefined) supplier.address = address || null;
    if (notes !== undefined) supplier.notes = notes || null;

    await supplier.save();
    res.json({ message: 'Cập nhật thành công', supplier });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const supplier = await findOrFail(Number(req.params.id));

    // Safe Delete: Không xóa nếu đã có phiếu mua hàng liên kết
    const linkedPurchases = await PurchaseOrder.findOne({ supplierId: supplier.id });
    if (linkedPurchases) {
      throw badRequest('Không thể xóa nhà cung cấp vì đã có phiếu nhập hàng liên kết. Vui lòng đổi trạng thái.');
    }

    await supplier.deleteOne();
    res.json({ message: 'Đã xóa nhà cung cấp' });
  }),
);

module.exports = router;
