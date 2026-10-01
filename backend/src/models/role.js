const mongoose = require('mongoose');
const { createSchema, idField } = require('./base');
const { RoleName, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const roleSchema = createSchema({
  id: idField,
  name: { type: String, enum: values(RoleName), required: true, unique: true },
  description: { type: String, required: true },
  permissions: { type: [String], default: [] },
});

roleSchema.plugin(autoIdPlugin('roles'));

module.exports = mongoose.model('Role', roleSchema);
