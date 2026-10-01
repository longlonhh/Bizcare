// Phiếu xuất hàng (bán hàng) & xuất kho.
const express = require('express');
const mongoose = require('mongoose');

const SalesOrder = require('../models/salesOrder');
const Product = require('../models/product');
const InventoryLog = require('../models/inventoryLog');
const { SalesOrderStatus, InventoryLogType, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, formatCode } = require('../lib/helpers');
const { nextId, nextIds } = require('../lib/id');
const { notFound, badRequest } = require('../lib/errors');
const { attachItemProducts } = require('../lib/orders');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.WAREHOUSE);

async function findOrFail(id) {
  // Không dùng .lean() vì các handler confirm/update/delete cần document thật
  // để gọi .save() / .deleteOne().
  const so = await SalesOrder.findOne({ id }).populate('customer');
  if (!so) throw notFound('Không tìm thấy phiếu xuất');
  return so;
}

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['exportDate']);
    const { customerId, exportDate, items, discount, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest('Phiếu xuất phải có ít nhất một dòng hàng');
    }

    const productIds = items.map((i) => Number(i.productId));
    const products = await Product.find({ id: { $in: productIds } });
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    let totalVat = 0;
    const orderItems = [];

    // Cấp trước dải ID cho các dòng hàng (1 lần gọi DB, tránh N+1).
    const itemIds = await nextIds('sales_order_items', items.length);

    for (const [index, raw] of items.entries()) {
      const product = byId.get(Number(raw.productId));
      if (!product) {
        throw notFound(`Sản phẩm ID ${raw.productId} không tồn tại`);
      }

      const quantity = Number(raw.quantity) || 0;

      // Không cho bán vượt tồn kho
      if (product.currentStock < quantity) {
        throw badRequest(
          `Sản phẩm "${product.name}" không đủ tồn kho. Còn ${product.currentStock}, yêu cầu ${quantity}`,
        );
      }

      const unitPrice = Number(raw.unitPrice) || 0;
      const vatRate = Number(raw.vatRate) || 0;

      const subtotal = quantity * unitPrice;
      const vatAmount = subtotal * (vatRate / 100);

      totalAmount += subtotal;
      totalVat += vatAmount;

      orderItems.push({
        id: itemIds[index],
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity,
        unitPrice,
        // Lưu giá vốn bình quân gia quyền tại thời điểm bán để tính COGS chính xác
        costPrice: product.costPrice,
        vatRate,
        vatAmount,
        subtotal,
      });
    }

    const discountValue = Number(discount) || 0;
    const seq = await nextId('sales_orders');

    const salesOrder = await SalesOrder.create({
      id: seq,
      code: formatCode('PX', seq),
      customerId: customerId != null ? Number(customerId) : null,
      exportDate,
      totalAmount,
      totalVat,
      grandTotal: totalAmount + totalVat - discountValue,
      discount: discountValue,
      notes: notes || null,
      createdBy: req.user.id,
      status: SalesOrderStatus.CONFIRMED,
      items: orderItems,
    });

    if (salesOrder.customerId != null) await salesOrder.populate('customer');

    res.status(201).json({
      message: 'Tạo phiếu xuất hàng thành công',
      salesOrder: await attachItemProducts(salesOrder),
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = Number(req.query.customerId);

    const orders = await SalesOrder.find(filter)
      .populate('customer')
      .sort({ createdAt: -1 })
      .lean();

    res.json(await attachItemProducts(orders));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await attachItemProducts(await findOrFail(Number(req.params.id))));
  }),
);

// Xác nhận xuất kho: trừ tồn kho và ghi lịch sử kho.
router.post(
  '/:id/confirm',
  canManage,
  asyncHandler(async (req, res) => {
    const so = await findOrFail(Number(req.params.id));

    if (so.status !== SalesOrderStatus.CONFIRMED) {
      throw badRequest('Phiếu phải ở trạng thái "Đã xác nhận"');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of so.items) {
        const product = await Product.findOne({ id: item.productId }).session(session);
        if (!product) continue;

        const stockBefore = product.currentStock;
        product.currentStock -= item.quantity;

        if (product.currentStock < 0) {
          throw badRequest(`Sản phẩm "${product.name}" không đủ tồn kho`);
        }

        await product.save({ session });

        await InventoryLog.create(
          [
            {
              productId: item.productId,
              type: InventoryLogType.EXPORT,
              quantity: -item.quantity,
              stockBefore,
              stockAfter: product.currentStock,
              referenceCode: so.code,
              referenceType: 'sales_order',
              referenceId: so.id,
              notes: `Xuất kho theo phiếu ${so.code}`,
              createdBy: req.user.id,
            },
          ],
          { session },
        );
      }

      so.status = SalesOrderStatus.COMPLETED;
      await so.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }

    res.json({
      message: 'Đã xác nhận xuất kho và trừ tồn kho',
      salesOrder: await attachItemProducts(await findOrFail(so.id)),
    });
  }),
);

router.put(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const so = await findOrFail(Number(req.params.id));

    if (req.body.status) {
      if (!Object.values(SalesOrderStatus).includes(req.body.status)) {
        throw badRequest('Trạng thái phiếu xuất không hợp lệ');
      }
      so.status = req.body.status;
    }
    if (req.body.notes !== undefined) so.notes = req.body.notes;

    await so.save();
    res.json({ message: 'Cập nhật thành công', salesOrder: await attachItemProducts(so) });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const so = await findOrFail(Number(req.params.id));
    if (so.status === SalesOrderStatus.COMPLETED) {
      throw badRequest('Không thể xóa phiếu đã hoàn thành');
    }
    await so.deleteOne();
    res.json({ message: 'Đã xóa phiếu xuất' });
  }),
);

module.exports = router;
