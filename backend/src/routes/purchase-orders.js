// Phiếu nhập hàng & nhập kho (kèm cập nhật giá vốn bình quân gia quyền).
const express = require('express');
const mongoose = require('mongoose');

const PurchaseOrder = require('../models/purchaseOrder');
const Product = require('../models/product');
const InventoryLog = require('../models/inventoryLog');
const { PurchaseOrderStatus, InventoryLogType, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, formatCode } = require('../lib/helpers');
const { nextId, nextIds } = require('../lib/id');
const { notFound, badRequest } = require('../lib/errors');
const { attachItemProducts } = require('../lib/orders');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.WAREHOUSE);

async function findOrFail(id) {
  const po = await PurchaseOrder.findOne({ id }).populate('supplier');
  if (!po) throw notFound('Không tìm thấy phiếu nhập');
  return po;
}

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['supplierId', 'importDate']);
    const { supplierId, importDate, items, notes } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest('Phiếu nhập phải có ít nhất một dòng hàng');
    }

    // Nạp sản phẩm một lần để kiểm tra tồn tại và lưu ảnh chụp mã/tên.
    const productIds = items.map((i) => Number(i.productId));
    const products = await Product.find({ id: { $in: productIds } });
    const byId = new Map(products.map((p) => [p.id, p]));

    let totalAmount = 0;
    let totalVat = 0;
    const orderItems = [];

    // Cấp trước dải ID cho các dòng hàng (1 lần gọi DB, tránh N+1).
    const itemIds = await nextIds('purchase_order_items', items.length);

    for (const [index, raw] of items.entries()) {
      const product = byId.get(Number(raw.productId));
      if (!product) {
        throw notFound(`Sản phẩm ID ${raw.productId} không tồn tại`);
      }

      const quantity = Number(raw.quantity) || 0;
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
        vatRate,
        vatAmount,
        subtotal,
        expectedSellingPrice: raw.expectedSellingPrice ?? null,
      });
    }

    const seq = await nextId('purchase_orders');
    const purchaseOrder = await PurchaseOrder.create({
      id: seq,
      code: formatCode('PN', seq),
      supplierId: Number(supplierId),
      importDate,
      totalAmount,
      totalVat,
      grandTotal: totalAmount + totalVat,
      notes: notes || null,
      createdBy: req.user.id,
      status: PurchaseOrderStatus.CONFIRMED,
      items: orderItems,
    });

    await purchaseOrder.populate('supplier');

    res.status(201).json({
      message: 'Tạo phiếu nhập hàng thành công',
      purchaseOrder: await attachItemProducts(purchaseOrder),
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.supplierId) filter.supplierId = Number(req.query.supplierId);

    const orders = await PurchaseOrder.find(filter)
      .populate('supplier')
      .sort({ createdAt: -1 });

    res.json(await attachItemProducts(orders));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await attachItemProducts(await findOrFail(Number(req.params.id))));
  }),
);

// Xác nhận nhập kho: cộng tồn, tính lại giá vốn bình quân, ghi lịch sử kho.
router.post(
  '/:id/confirm',
  canManage,
  asyncHandler(async (req, res) => {
    const po = await findOrFail(Number(req.params.id));

    if (po.status !== PurchaseOrderStatus.CONFIRMED) {
      throw badRequest('Phiếu phải ở trạng thái "Đã xác nhận" mới có thể nhập kho');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (const item of po.items) {
        const product = await Product.findOne({ id: item.productId }).session(session);
        if (!product) continue;

        const stockBefore = product.currentStock;
        product.currentStock += item.quantity;

        // Giá vốn bình quân gia quyền
        const totalCostBefore = product.costPrice * stockBefore;
        const totalCostNew = totalCostBefore + item.subtotal;
        const newQuantity = stockBefore + item.quantity;
        if (newQuantity > 0) {
          product.costPrice = totalCostNew / newQuantity;
        }

        if (item.expectedSellingPrice) {
          product.sellingPrice = item.expectedSellingPrice;
        }

        await product.save({ session });

        await InventoryLog.create(
          [
            {
              productId: item.productId,
              type: InventoryLogType.IMPORT,
              quantity: item.quantity,
              stockBefore,
              stockAfter: product.currentStock,
              referenceCode: po.code,
              referenceType: 'purchase_order',
              referenceId: po.id,
              notes: `Nhập kho theo phiếu ${po.code}`,
              createdBy: req.user.id,
            },
          ],
          { session },
        );
      }

      po.status = PurchaseOrderStatus.RECEIVED;
      await po.save({ session });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }

    res.json({
      message: 'Đã xác nhận nhập kho thành công',
      purchaseOrder: await attachItemProducts(await findOrFail(po.id)),
    });
  }),
);

router.put(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const po = await findOrFail(Number(req.params.id));

    if (req.body.status) {
      if (!Object.values(PurchaseOrderStatus).includes(req.body.status)) {
        throw badRequest('Trạng thái phiếu nhập không hợp lệ');
      }
      po.status = req.body.status;
    }
    if (req.body.notes !== undefined) po.notes = req.body.notes;

    await po.save();
    res.json({
      message: 'Cập nhật thành công',
      purchaseOrder: await attachItemProducts(po),
    });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const po = await findOrFail(Number(req.params.id));
    if (po.status === PurchaseOrderStatus.RECEIVED) {
      throw badRequest('Không thể xóa phiếu đã nhập kho');
    }
    await po.deleteOne();
    res.json({ message: 'Đã xóa phiếu nhập' });
  }),
);

module.exports = router;
