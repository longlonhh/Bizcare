const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { PurchaseOrderStatus, PaymentStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

// Chi tiết phiếu nhập được nhúng thẳng vào phiếu (không còn bảng purchase_order_items riêng).
// Ảnh chụp productCode/productName giữ lại lịch sử ngay cả khi sản phẩm đổi tên về sau.
const purchaseOrderItemSchema = new mongoose.Schema(
  {
    id: { type: Number },
    productId: { type: Number, required: true },
    productCode: { type: String, default: null },
    productName: { type: String, default: null },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    vatRate: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    expectedSellingPrice: { type: Number, default: null },
  },
  { _id: false, id: false, versionKey: false },
);

const purchaseOrderSchema = createSchema({
  id: idField,
  code: { type: String, required: true, unique: true },
  supplierId: refField('Supplier'),
  // Ngày nhập dạng chuỗi YYYY-MM-DD để so sánh khoảng ngày bằng chuỗi.
  importDate: { type: String, required: true },
  status: {
    type: String,
    enum: values(PurchaseOrderStatus),
    default: PurchaseOrderStatus.DRAFT,
  },
  paymentStatus: {
    type: String,
    enum: values(PaymentStatus),
    default: PaymentStatus.UNPAID,
  },
  totalAmount: { type: Number, default: 0 },
  totalVat: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  notes: { type: String, default: null },
  createdBy: { type: Number, required: true },
  items: { type: [purchaseOrderItemSchema], default: [] },
});

virtualRef(purchaseOrderSchema, {
  path: 'supplier',
  ref: 'Supplier',
  localField: 'supplierId',
  foreignField: 'id',
});

purchaseOrderSchema.plugin(autoIdPlugin('purchase_orders'));

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
