// Chấm công nhân sự.
const express = require('express');

const Attendance = require('../models/attendance');
const { AttendanceStatus, RoleName, values } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, todayISO } = require('../lib/helpers');
const { monthlyAttendanceSummary } = require('../lib/attendance');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.HR);

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['employeeId', 'date', 'status']);
    const { employeeId, date, status, hoursWorked, checkIn, checkOut, notes } = req.body;

    if (!values(AttendanceStatus).includes(status)) {
      throw badRequest('Trạng thái chấm công không hợp lệ');
    }

    const employeeIdNum = Number(employeeId);

    // Mỗi nhân viên chỉ chấm công một lần mỗi ngày
    const existing = await Attendance.findOne({ employeeId: employeeIdNum, date });
    if (existing) {
      throw badRequest('Đã chấm công cho nhân viên này ngày này rồi');
    }

    const attendance = await Attendance.create({
      employeeId: employeeIdNum,
      date,
      status,
      hoursWorked:
        hoursWorked !== undefined
          ? Number(hoursWorked)
          : status === AttendanceStatus.PRESENT
            ? 8
            : 0,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      notes: notes || null,
      createdBy: req.user.id,
    });

    await attendance.populate('employee');

    res.status(201).json({ message: 'Chấm công thành công', attendance: attendance.toJSON() });
  }),
);

router.get(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    const { employeeId, month, year, from, to } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = Number(employeeId);

    if (month && year) {
      filter.date = { $regex: `^${year}-${String(month).padStart(2, '0')}` };
    } else {
      const range = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      if (Object.keys(range).length > 0) filter.date = range;
    }

    const records = await Attendance.find(filter).populate('employee').sort({ date: -1 });
    res.json(records.map((r) => r.toJSON()));
  }),
);

// Tổng hợp chấm công theo tháng
router.get(
  '/summary',
  canManage,
  asyncHandler(async (req, res) => {
    const { employeeId, year, month } = req.query;
    requireFields(req.query, ['employeeId', 'year', 'month']);

    const summary = await monthlyAttendanceSummary(
      Number(employeeId),
      Number(year),
      Number(month),
    );

    res.json({
      employeeId: Number(employeeId),
      year: Number(year),
      month: Number(month),
      today: todayISO(),
      ...summary,
    });
  }),
);

router.delete(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    const attendance = await Attendance.findOne({ id: Number(req.params.id) });
    if (!attendance) throw notFound('Không tìm thấy bản ghi chấm công');
    await attendance.deleteOne();
    res.json({ message: 'Đã xóa bản ghi chấm công' });
  }),
);

module.exports = router;
