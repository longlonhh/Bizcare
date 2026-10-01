// Quản lý khách hàng (CRM).
const express = require('express');

const Customer = require('../models/customer');
const SalesOrder = require('../models/salesOrder');
const { RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, maxCodeNumber } = require('../lib/helpers');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.ACCOUNTANT);

async function findOrFail(id) {
  const customer = await Customer.findOne({ id });
  if (!customer) throw notFound('Không tìm thấy khách hàng');
  return customer;
}

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name']);
    const { name, taxCode, phone, email, address, notes } = req.body;

    // Sinh mã KH: KH1, KH2, KH3... (tối ưu: chỉ lấy bản ghi cuối)
    const lastCustomer = await Customer.findOne().sort({ id: -1 });
    const code = `KH${maxCodeNumber([lastCustomer?.code || 'KH0'], 'KH') + 1}`;

    const customer = await Customer.create({
      code,
      name,
      taxCode: taxCode || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
    });

    res.status(201).json({ message: 'Tạo khách hàng thành công', customer: customer.toJSON() });
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
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json(customers);
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
  canManage,
  asyncHandler(async (req, res) => {
    const customer = await findOrFail(Number(req.params.id));
    const { name, taxCode, phone, email, address, notes } = req.body;

    if (name !== undefined) customer.name = name;
    if (taxCode !== undefined) customer.taxCode = taxCode || null;
    if (phone !== undefined) customer.phone = phone || null;
    if (email !== undefined) customer.email = email || null;
    if (address !== undefined) customer.address = address || null;
    if (notes !== undefined) customer.notes = notes || null;

    await customer.save();
    res.json({ message: 'Cập nhật thành công', customer });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const customer = await findOrFail(Number(req.params.id));

    // Safe Delete: Không xóa nếu đã có hóa đơn liên kết
    const linkedOrders = await SalesOrder.findOne({ customerId: customer.id });
    if (linkedOrders) {
      throw badRequest('Không thể xóa khách hàng vì đã có Phiếu Xuất hàng liên kết. Vui lòng đổi trạng thái.');
    }

    await customer.deleteOne();
    res.json({ message: 'Đã xóa khách hàng' });
  }),
);

module.exports = router;
