const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { SalesOrderStatus, SalesPaymentStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

// Chi tiết phiếu xuất được nhúng thẳng vào phiếu (không còn bảng sales_order_items riêng).
const salesOrderItemSchema = new mongoose.Schema(
  {
    id: { type: Number },
    productId: { type: Number, required: true },
    productCode: { type: String, default: null },
    productName: { type: String, default: null },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    // Giá vốn bình quân gia quyền tại thời điểm xuất kho — dùng để tính COGS chính xác
    costPrice: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
  },
  { _id: false, id: false, versionKey: false },
);

const salesOrderSchema = createSchema({
  id: idField,
  code: { type: String, required: true, unique: true },
  customerId: refField('Customer'),
  // Ngày xuất dạng chuỗi YYYY-MM-DD để so sánh khoảng ngày bằng chuỗi.
  exportDate: { type: String, required: true },
  status: {
    type: String,
    enum: values(SalesOrderStatus),
    default: SalesOrderStatus.DRAFT,
  },
  paymentStatus: {
    type: String,
    enum: values(SalesPaymentStatus),
    default: SalesPaymentStatus.UNPAID,
  },
  totalAmount: { type: Number, default: 0 },
  totalVat: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  notes: { type: String, default: null },
  createdBy: { type: Number, required: true },
  items: { type: [salesOrderItemSchema], default: [] },
});

virtualRef(salesOrderSchema, {
  path: 'customer',
  ref: 'Customer',
  localField: 'customerId',
  foreignField: 'id',
});

salesOrderSchema.plugin(autoIdPlugin('sales_orders'));

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
