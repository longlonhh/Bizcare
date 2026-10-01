const mongoose = require('mongoose');
const { createSchema, idField } = require('./base');
const { TaxType, TaxPeriodType, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const taxRecordSchema = createSchema({
  id: idField,
  taxType: { type: String, enum: values(TaxType), required: true },
  periodType: { type: String, enum: values(TaxPeriodType), required: true },
  year: { type: Number, required: true },
  month: { type: Number, default: null },
  quarter: { type: Number, default: null },
  totalRevenue: { type: Number, default: 0 },
  totalCost: { type: Number, default: 0 },
  taxableIncome: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  vatOutput: { type: Number, default: 0 },
  vatInput: { type: Number, default: 0 },
  vatPayable: { type: Number, default: 0 },
  notes: { type: String, default: null },
  xmlData: { type: String, default: null },
});

taxRecordSchema.plugin(autoIdPlugin('tax_records'));

module.exports = mongoose.model('TaxRecord', taxRecordSchema);
