// Hồ sơ nhân viên.
const express = require('express');

const Employee = require('../models/employee');
const { SalaryType, RoleName, values } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields } = require('../lib/helpers');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.HR);

async function findOrFail(id) {
  const employee = await Employee.findOne({ id });
  if (!employee) throw notFound('Không tìm thấy nhân viên');
  return employee;
}

router.post(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['name', 'position', 'salaryType']);
    const {
      name,
      phone,
      email,
      position,
      salaryType,
      monthlySalary,
      hourlyRate,
      workingHoursPerDay,
      startDate,
      notes,
    } = req.body;

    if (!values(SalaryType).includes(salaryType)) {
      throw badRequest(`Cơ chế lương không hợp lệ. Chỉ chấp nhận: ${values(SalaryType).join(', ')}`);
    }

    const employee = await Employee.create({
      name,
      phone: phone || null,
      email: email || null,
      position,
      salaryType,
      monthlySalary: Number(monthlySalary) || 0,
      hourlyRate: Number(hourlyRate) || 0,
      workingHoursPerDay: Number(workingHoursPerDay) || 8,
      startDate: startDate || null,
      notes: notes || null,
    });

    res.status(201).json({ message: 'Thêm nhân viên thành công', employee: employee.toJSON() });
  }),
);

router.get(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      const keyword = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: keyword, $options: 'i' };
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 });
    res.json(employees.map((e) => e.toJSON()));
  }),
);

router.get(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    res.json((await findOrFail(Number(req.params.id))).toJSON());
  }),
);

router.put(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    const employee = await findOrFail(Number(req.params.id));

    const editable = [
      'name',
      'phone',
      'email',
      'position',
      'salaryType',
      'monthlySalary',
      'hourlyRate',
      'workingHoursPerDay',
      'startDate',
      'status',
      'notes',
    ];

    for (const field of editable) {
      if (req.body[field] !== undefined) employee[field] = req.body[field];
    }

    await employee.save();
    res.json({ message: 'Cập nhật thành công', employee: employee.toJSON() });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const employee = await findOrFail(Number(req.params.id));
    await employee.deleteOne();
    res.json({ message: 'Đã xóa nhân viên' });
  }),
);

module.exports = router;
