// Danh sách vai trò (công khai, dùng cho trang đăng ký / hiển thị nhãn).
const express = require('express');
const Role = require('../models/role');
const { asyncHandler } = require('../lib/helpers');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const roles = await Role.find().sort({ id: 1 });
    res.json(roles.map((r) => r.toJSON()));
  }),
);

module.exports = router;
