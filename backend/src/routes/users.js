// Tra cứu người dùng nội bộ (dùng cho các phân hệ khác).
const express = require('express');
const User = require('../models/user');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, sanitizeUser } = require('../lib/helpers');
const { notFound } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(sanitizeUser(req.user));
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ id: Number(req.params.id) }).populate('role');
    if (!user) throw notFound('Không tìm thấy người dùng');
    res.json(sanitizeUser(user));
  }),
);

module.exports = router;
