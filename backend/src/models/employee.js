const mongoose = require('mongoose');
const { createSchema, idField } = require('./base');
const { SalaryType, EmployeeStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const employeeSchema = createSchema({
  id: idField,
  name: { type: String, required: true },
  phone: { type: String, default: null },
  email: { type: String, default: null },
  position: { type: String, required: true },
  salaryType: { type: String, enum: values(SalaryType), default: SalaryType.MONTHLY },
  monthlySalary: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  workingHoursPerDay: { type: Number, default: 8 },
  startDate: { type: String, default: null },
  status: { type: String, enum: values(EmployeeStatus), default: EmployeeStatus.ACTIVE },
  notes: { type: String, default: null },
});

employeeSchema.plugin(autoIdPlugin('employees'));

module.exports = mongoose.model('Employee', employeeSchema);
