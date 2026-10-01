const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { autoIdPlugin } = require('../lib/id');

const salarySchema = createSchema(
  {
    id: idField,
    employeeId: refField('Employee'),
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    totalWorkingDays: { type: Number, default: 0 },
    totalLeaveDays: { type: Number, default: 0 },
    totalAbsentDays: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    baseSalary: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    notes: { type: String, default: null },
    calculatedBy: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Mỗi nhân viên chỉ có 1 bảng lương cho mỗi tháng.
salarySchema.index({ employeeId: 1, year: 1, month: 1 }, { unique: true });

virtualRef(salarySchema, {
  path: 'employee',
  ref: 'Employee',
  localField: 'employeeId',
  foreignField: 'id',
});

salarySchema.plugin(autoIdPlugin('salaries'));

module.exports = mongoose.model('Salary', salarySchema);
