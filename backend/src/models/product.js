const mongoose = require('mongoose');
const { createSchema, idField } = require('./base');
const { ProductStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const productSchema = createSchema({
  id: idField,
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  unit: { type: String, default: 'cái' },
  barcode: { type: String, default: null },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  description: { type: String, default: null },
  imageUrl: { type: String, default: null },
  status: { type: String, enum: values(ProductStatus), default: ProductStatus.ACTIVE },
});

productSchema.index({ name: 'text' });
productSchema.plugin(autoIdPlugin('products'));

module.exports = mongoose.model('Product', productSchema);
