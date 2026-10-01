const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { InvoiceType, InvoiceStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const invoiceSchema = createSchema(
  {
    id: idField,
    code: { type: String, required: true, unique: true },
    salesOrderId: refField('SalesOrder'),
    type: { type: String, enum: values(InvoiceType), default: InvoiceType.RETAIL },
    status: { type: String, enum: values(InvoiceStatus), default: InvoiceStatus.DRAFT },
    totalAmount: { type: Number, required: true },
    totalVat: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    customerName: { type: String, default: null },
    customerTaxCode: { type: String, default: null },
    customerPhone: { type: String, default: null },
    customerEmail: { type: String, default: null },
    notes: { type: String, default: null },
  },
  // Hoá đơn chỉ có createdAt, không cần updatedAt.
  { timestamps: { createdAt: true, updatedAt: false } },
);

virtualRef(invoiceSchema, {
  path: 'salesOrder',
  ref: 'SalesOrder',
  localField: 'salesOrderId',
  foreignField: 'id',
});

invoiceSchema.plugin(autoIdPlugin('invoices'));

module.exports = mongoose.model('Invoice', invoiceSchema);
