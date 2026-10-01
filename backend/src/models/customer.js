const mongoose = require('mongoose');
const { createSchema, idField } = require('./base');
const { autoIdPlugin } = require('../lib/id');

const customerSchema = createSchema({
  id: idField,
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  taxCode: { type: String, default: null },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  address: { type: String, default: null },
  notes: { type: String, default: null },
});

customerSchema.plugin(autoIdPlugin('customers'));

module.exports = mongoose.model('Customer', customerSchema);
