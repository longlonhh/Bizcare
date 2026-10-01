// Tính lương theo tháng / theo giờ từ dữ liệu chấm công thật.
const express = require('express');

const Salary = require('../models/salary');
const Employee = require('../models/employee');
const { SalaryType, EmployeeStatus, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields } = require('../lib/helpers');
const { monthlyAttendanceSummary } = require('../lib/attendance');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.HR);

// Số ngày công chuẩn dùng để chia lương tháng
const STANDARD_WORKING_DAYS = 26;

/**
 * Tính các con số lương cho một nhân viên trong tháng.
 * - Lương tháng: nghỉ phép hưởng nguyên lương, chỉ trừ ngày nghỉ KHÔNG phép.
 * - Lương giờ: trả theo số giờ làm việc thực tế.
 */
async function computeSalaryFor(employee, year, month, userId) {
  const att = await monthlyAttendanceSummary(employee.id, year, month);

  let baseSalary;
  let deductions = 0;
  let netSalary;

  if (employee.salaryType === SalaryType.MONTHLY) {
    baseSalary = employee.monthlySalary;
    const dailyRate = baseSalary / STANDARD_WORKING_DAYS;
    deductions = att.absentDays * dailyRate;
    netSalary = Math.max(0, baseSalary - deductions);
  } else {
    baseSalary = employee.hourlyRate;
    netSalary = att.totalHours * employee.hourlyRate;
  }

  const salary = await Salary.create({
    employeeId: employee.id,
    year,
    month,
    totalWorkingDays: att.totalWorkingDays,
    totalLeaveDays: att.leaveDays,
    totalAbsentDays: att.absentDays,
    totalHoursWorked: att.totalHours,
    baseSalary,
    overtimePay: 0,
    deductions,
    netSalary,
    calculatedBy: userId,
  });

  return { salary, att, baseSalary, deductions, netSalary };
}

// ============ TÍNH LƯƠNG MỘT NHÂN VIÊN ============
router.post(
  '/calculate',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['employeeId', 'year', 'month']);
    const employeeId = Number(req.body.employeeId);
    const year = Number(req.body.year);
    const month = Number(req.body.month);

    const employee = await Employee.findOne({ id: employeeId });
    if (!employee) throw notFound('Không tìm thấy nhân viên');

    const existing = await Salary.findOne({ employeeId, year, month });
    if (existing) throw badRequest('Đã tính lương tháng này rồi');

    const { salary, att, baseSalary, deductions, netSalary } = await computeSalaryFor(
      employee,
      year,
      month,
      req.user.id,
    );

    await salary.populate('employee');

    res.json({
      message: 'Tính lương thành công',
      salary: salary.toJSON(),
      summary: {
        nhânViên: employee.name,
        chứcVụ: employee.position,
        kiểuLương:
          employee.salaryType === SalaryType.MONTHLY ? 'Theo tháng' : 'Theo giờ',
        ngàyLàm: att.totalWorkingDays,
        ngàyNghỉPhép: att.leaveDays,
        ngàyNghỉKhôngPhép: att.absentDays,
        tổngGiờLàm: att.totalHours,
        lươngCơBản: baseSalary,
        khấuTrừ: deductions,
        lươngThựcNhận: netSalary,
      },
    });
  }),
);

// ============ TÍNH LƯƠNG TẤT CẢ NHÂN VIÊN ============
router.post(
  '/calculate-all',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['year', 'month']);
    const year = Number(req.body.year);
    const month = Number(req.body.month);

    const employees = await Employee.find({ status: EmployeeStatus.ACTIVE });
    const results = [];
    const errors = [];

    for (const employee of employees) {
      const existing = await Salary.findOne({ employeeId: employee.id, year, month });
      if (existing) {
        errors.push(`${employee.name} đã tính lương tháng ${month}/${year} rồi`);
        continue;
      }

      const { netSalary } = await computeSalaryFor(employee, year, month, req.user.id);
      results.push({ employee: employee.name, netSalary });
    }

    res.json({
      message: `Đã tính lương ${results.length} nhân viên${
        errors.length > 0 ? `, ${errors.length} nhân viên đã được tính trước đó` : ''
      }`,
      results,
      errors,
    });
  }),
);

router.get(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.employeeId) filter.employeeId = Number(req.query.employeeId);
    if (req.query.month) filter.month = Number(req.query.month);
    if (req.query.year) filter.year = Number(req.query.year);

    const salaries = await Salary.find(filter)
      .populate('employee')
      .sort({ year: -1, month: -1 });

    res.json(salaries.map((s) => s.toJSON()));
  }),
);

router.get(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    const salary = await Salary.findOne({ id: Number(req.params.id) }).populate('employee');
    if (!salary) throw notFound('Không tìm thấy bản ghi lương');
    res.json(salary.toJSON());
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const salary = await Salary.findOne({ id: Number(req.params.id) });
    if (!salary) throw notFound('Không tìm thấy bản ghi lương');
    await salary.deleteOne();
    res.json({ message: 'Đã xóa bản ghi lương' });
  }),
);

module.exports = router;
