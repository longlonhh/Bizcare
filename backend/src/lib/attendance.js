// Tổng hợp chấm công theo tháng — dùng chung cho phân hệ chấm công và tính lương.
const Attendance = require('../models/attendance');
const { AttendanceStatus } = require('../models/enums');

const EMPTY = {
  workingDays: 0,
  leaveDays: 0,
  absentDays: 0,
  halfDays: 0,
  totalHours: 0,
  totalWorkingDays: 0,
};

/** Tổng hợp số ngày công / nghỉ / giờ làm của một nhân viên trong tháng. */
async function monthlyAttendanceSummary(employeeId, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const [row] = await Attendance.aggregate([
    { $match: { employeeId, date: { $regex: `^${prefix}` } } },
    {
      $group: {
        _id: null,
        workingDays: {
          $sum: {
            $cond: [
              { $in: ['$status', [AttendanceStatus.PRESENT, AttendanceStatus.LATE]] },
              1,
              0,
            ],
          },
        },
        leaveDays: {
          $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.LEAVE] }, 1, 0] },
        },
        absentDays: {
          $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.ABSENT] }, 1, 0] },
        },
        halfDays: {
          $sum: { $cond: [{ $eq: ['$status', AttendanceStatus.HALF_DAY] }, 1, 0] },
        },
        totalHours: { $sum: '$hoursWorked' },
      },
    },
  ]);

  if (!row) return { ...EMPTY };

  return {
    workingDays: row.workingDays,
    leaveDays: row.leaveDays,
    absentDays: row.absentDays,
    halfDays: row.halfDays,
    totalHours: row.totalHours,
    // Nửa ca tính 0.5 ngày công
    totalWorkingDays: row.workingDays + row.halfDays * 0.5,
  };
}

module.exports = { monthlyAttendanceSummary };
