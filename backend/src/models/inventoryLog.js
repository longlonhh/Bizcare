const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { InventoryLogType, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

// Mọi biến động tồn kho đều sinh ra từ thao tác thật:
// phiếu nhập được nhập kho, phiếu xuất được xuất kho, hoặc điều chỉnh kiểm kê.
const inventoryLogSchema = createSchema({
  id: idField,
  productId: refField('Product'),
  type: { type: String, enum: values(InventoryLogType), required: true },
  // Số lượng thay đổi: dương khi nhập, âm khi xuất.
  quantity: { type: Number, required: true },
  stockBefore: { type: Number, required: true },
  stockAfter: { type: Number, required: true },
  referenceCode: { type: String, default: null },
  referenceType: { type: String, required: true },
  referenceId: { type: Number, default: null },
  notes: { type: String, default: null },
  createdBy: { type: Number, required: true },
});

virtualRef(inventoryLogSchema, {
  path: 'product',
  ref: 'Product',
  localField: 'productId',
  foreignField: 'id',
});

inventoryLogSchema.plugin(autoIdPlugin('inventory_logs'));

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
