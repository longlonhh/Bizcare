// Đăng nhập, đăng ký, OTP và quản trị tài khoản người dùng.
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const config = require('../config');
const User = require('../models/user');
const Role = require('../models/role');
const { RoleName, UserStatus, values } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, requireFields, sanitizeUser } = require('../lib/helpers');
const { unauthorized, conflict, notFound, badRequest } = require('../lib/errors');
const { decryptPassword, verifyPassword } = require('../lib/crypto');

const router = express.Router();

// Giới hạn tần suất cho các endpoint nhạy cảm (chống brute-force / spam OTP).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20, // tối đa 20 lần / IP / 15 phút
  standardHeaders: true,
  legacyHeaders: false,
  message: { statusCode: 429, message: 'Quá nhiều yêu cầu, vui lòng thử lại sau ít phút' },
});

// Lưu OTP trong bộ nhớ (production nên dùng Redis).
const otpStore = new Map();

/** Kiểm tra người thao tác có phải Admin không. */
async function assertAdmin(adminId) {
  const admin = await User.findOne({ id: adminId }).populate('role');
  if (admin?.role?.name !== RoleName.ADMIN) {
    throw unauthorized('Chỉ Admin mới có quyền thực hiện thao tác này');
  }
  return admin;
}

/** Đảm bảo mật khẩu mới không trùng với mật khẩu của bất kỳ tài khoản đã có. */
async function assertPasswordNotUsed(password) {
  const users = await User.find().select('password');
  for (const u of users) {
    if (await verifyPassword(password, u.password)) {
      throw conflict('Mật khẩu đã được sử dụng bởi tài khoản khác, vui lòng chọn mật khẩu khác');
    }
  }
}

// ============ ĐĂNG KÝ ADMIN ============
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['username', 'password', 'fullName', 'phone']);
    const { username, password, fullName, phone, email } = req.body;

    if (String(password).length < 6) {
      throw badRequest('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Chỉ cấm trùng tên đăng nhập — SĐT/email được phép trùng hoặc bỏ trống.
    const existing = await User.findOne({ username });
    if (existing) {
      throw conflict('Tên đăng nhập đã tồn tại, vui lòng chọn tên khác');
    }
    await assertPasswordNotUsed(password);

    const adminRole = await Role.findOne({ name: RoleName.ADMIN });

    const user = await User.create({
      username,
      password,
      fullName,
      phone,
      email: email || null,
      roleId: adminRole?.id ?? null,
      isPhoneVerified: false,
      status: UserStatus.ACTIVE,
    });

    res.status(201).json({
      message: 'Đăng ký thành công. Vui lòng xác thực SĐT.',
      user: sanitizeUser(user),
    });
  }),
);

// ============ ĐĂNG NHẬP ============
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['username', 'password']);
    const { username, password } = req.body;

    const user = await User.findOne({ username }).populate('role');

    if (!user) throw unauthorized('Tên đăng nhập hoặc mật khẩu không đúng');
    if (user.status === UserStatus.DEACTIVATED) throw unauthorized('Tài khoản đã bị khóa');

    // Xác thực an toàn bằng verifyPassword (bcrypt, có hỗ trợ dữ liệu cũ)
    if (!(await verifyPassword(password, user.password))) {
      throw unauthorized('Tên đăng nhập hoặc mật khẩu không đúng');
    }

    // Tự động mã hóa lại nếu còn là plaintext cũ
    if (!String(user.password).startsWith('enc:')) {
      user.password = password; // hook pre('save') sẽ mã hóa lại
      await user.save();
    }

    const accessToken = jwt.sign(
      { sub: user.id, username: user.username, role: user.role?.name },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    res.json({ accessToken, user: sanitizeUser(user) });
  }),
);

// ============ YÊU CẦU OTP ============
router.post(
  '/request-otp',
  authLimiter,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['phone']);
    const { phone } = req.body;

    const user = await User.findOne({ phone });
    if (!user) throw notFound('Không tìm thấy tài khoản với số điện thoại này');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // TODO: gửi OTP qua SMS (Twilio / SpeedSMS / Zalo ZNS)
    console.log(`📱 OTP cho ${phone}: ${otp}`);

    res.json({ message: 'Mã OTP đã được gửi đến số điện thoại của bạn' });
  }),
);

// ============ ĐẶT LẠI MẬT KHẨU ============
router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['phone', 'otp', 'newPassword']);
    const { phone, otp, newPassword } = req.body;

    const otpData = otpStore.get(phone);
    if (!otpData) throw badRequest('Mã OTP không tồn tại hoặc đã hết hạn');
    if (otpData.code !== otp) throw badRequest('Mã OTP không đúng');
    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(phone);
      throw badRequest('Mã OTP đã hết hạn');
    }

    const user = await User.findOne({ phone });
    if (!user) throw notFound('Không tìm thấy tài khoản');

    user.password = newPassword;
    await user.save();
    otpStore.delete(phone);

    res.json({ message: 'Đặt lại mật khẩu thành công' });
  }),
);

// ============ QUẢN TRỊ TÀI KHOẢN (chỉ Admin) ============
const adminOnly = [authenticate, authorize(RoleName.ADMIN)];

router.post(
  '/users',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['username', 'password', 'fullName', 'role']);
    const { username, password, fullName, phone, email, role } = req.body;

    if (!values(RoleName).includes(role)) {
      throw badRequest(`Vai trò không hợp lệ. Chỉ chấp nhận: ${values(RoleName).join(', ')}`);
    }

    if (String(password).length < 6) {
      throw badRequest('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Chỉ cấm trùng tên đăng nhập — SĐT/email được phép trùng hoặc bỏ trống.
    const existing = await User.findOne({ username });
    if (existing) throw conflict('Tên đăng nhập đã tồn tại, vui lòng chọn tên khác');
    await assertPasswordNotUsed(password);

    const roleDoc = await Role.findOne({ name: role });

    const user = await User.create({
      username,
      password,
      fullName,
      phone: (phone || '').trim() || '',
      email: (email || '').trim() || null,
      roleId: roleDoc?.id ?? null,
      createdBy: req.user.id,
      status: UserStatus.ACTIVE,
    });

    res.status(201).json({ message: 'Tạo tài khoản thành công', user: sanitizeUser(user) });
  }),
);

router.get(
  '/users',
  ...adminOnly,
  asyncHandler(async (_req, res) => {
    const users = await User.find().populate('role').sort({ createdAt: -1 });
    // Tuyệt đối không trả về mật khẩu trong danh sách công khai
    res.json(users.map((u) => sanitizeUser(u)));
  }),
);

// Admin xem mật khẩu của nhân viên sau khi xác thực mật khẩu của chính Admin
router.post(
  '/users/:id/reveal-password',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['adminPassword']);
    const { adminPassword } = req.body;
    const targetUserId = Number(req.params.id);

    // Xác thực mật khẩu của chính Admin đang gửi yêu cầu
    const currentAdmin = await User.findOne({ id: req.user.id });
    if (!currentAdmin) throw notFound('Không tìm thấy tài khoản admin');

    const isValidAdmin = await verifyPassword(adminPassword, currentAdmin.password);
    if (!isValidAdmin) {
      throw unauthorized('Mật khẩu quản trị viên không chính xác');
    }

    // Tìm user đích cần xem mật khẩu
    const targetUser = await User.findOne({ id: targetUserId });
    if (!targetUser) throw notFound('Không tìm thấy tài khoản nhân viên');

    const plainPassword = decryptPassword(targetUser.password);
    if (!plainPassword) {
      throw badRequest('Không thể giải mã mật khẩu của tài khoản này');
    }

    res.json({
      id: targetUser.id,
      username: targetUser.username,
      fullName: targetUser.fullName,
      password: plainPassword,
    });
  }),
);

// Người dùng tự đổi mật khẩu của chính mình (yêu cầu mật khẩu hiện tại).
router.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['currentPassword', 'newPassword']);
    const { currentPassword, newPassword } = req.body;

    if (String(newPassword).length < 6) {
      throw badRequest('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    const user = await User.findOne({ id: req.user.id });
    if (!user) throw notFound('Không tìm thấy tài khoản');

    if (!(await verifyPassword(currentPassword, user.password))) {
      throw unauthorized('Mật khẩu hiện tại không chính xác');
    }

    user.password = newPassword; // hook pre('save') sẽ băm lại
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công' });
  }),
);

router.post(
  '/users/:id/update',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { fullName, phone, email, role, password } = req.body;

    const user = await User.findOne({ id: userId });
    if (!user) throw notFound('Không tìm thấy tài khoản');

    if (role) {
      if (!values(RoleName).includes(role)) throw badRequest('Vai trò không hợp lệ');
      const roleDoc = await Role.findOne({ name: role });
      if (roleDoc) user.roleId = roleDoc.id;
    }

    if (password) {
      if (String(password).length < 6) throw badRequest('Mật khẩu phải có ít nhất 6 ký tự');
      user.password = password;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;

    await user.save();

    const updated = await User.findOne({ id: userId }).populate('role');
    res.json({ message: 'Cập nhật thành công', user: updated.toJSON() });
  }),
);

router.post(
  '/users/:id/deactivate',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);

    if (req.user.id === userId) {
      throw badRequest('Không thể khóa tài khoản của chính mình');
    }

    const user = await User.findOne({ id: userId });
    if (!user) throw notFound('Không tìm thấy tài khoản');

    user.status =
      user.status === UserStatus.ACTIVE ? UserStatus.DEACTIVATED : UserStatus.ACTIVE;
    await user.save();

    res.json({
      message:
        user.status === UserStatus.ACTIVE
          ? 'Đã kích hoạt lại tài khoản'
          : 'Đã khóa tài khoản',
    });
  }),
);

router.post(
  '/users/:id/delete',
  ...adminOnly,
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);

    if (req.user.id === userId) {
      throw badRequest('Không thể xóa tài khoản của chính mình');
    }

    const user = await User.findOne({ id: userId });
    if (!user) throw notFound('Không tìm thấy tài khoản');

    await user.deleteOne();
    res.json({ message: 'Đã xóa tài khoản vĩnh viễn' });
  }),
);

module.exports = router;
