const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { AttendanceStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');

const attendanceSchema = createSchema(
  {
    id: idField,
    employeeId: refField('Employee'),
    // Ngày chấm công dạng chuỗi YYYY-MM-DD.
    date: { type: String, required: true },
    status: {
      type: String,
      enum: values(AttendanceStatus),
      default: AttendanceStatus.PRESENT,
    },
    hoursWorked: { type: Number, default: 8 },
    checkIn: { type: String, default: null },
    checkOut: { type: String, default: null },
    notes: { type: String, default: null },
    createdBy: { type: Number, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Một nhân viên chỉ chấm công 1 lần mỗi ngày.
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

virtualRef(attendanceSchema, {
  path: 'employee',
  ref: 'Employee',
  localField: 'employeeId',
  foreignField: 'id',
});

attendanceSchema.plugin(autoIdPlugin('attendances'));

module.exports = mongoose.model('Attendance', attendanceSchema);
