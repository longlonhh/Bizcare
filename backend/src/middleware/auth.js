// Xác thực JWT và phân quyền theo vai trò.
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/user');
const { UserStatus } = require('../models/enums');
const { unauthorized, forbidden } = require('../lib/errors');

/** Bắt buộc có Bearer token hợp lệ; gắn user (kèm role) vào req.user. */
async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (!token || scheme !== 'Bearer') {
      throw unauthorized('Chưa cung cấp token xác thực');
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      throw unauthorized('Token không hợp lệ hoặc đã hết hạn');
    }

    const user = await User.findOne({ id: payload.sub }).populate('role');

    if (!user || user.status === UserStatus.DEACTIVATED) {
      throw unauthorized('Tài khoản không tồn tại hoặc đã bị khóa');
    }
    if (user.status === UserStatus.INACTIVE) {
      throw unauthorized('Tài khoản chưa được kích hoạt');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Chỉ cho phép các vai trò được liệt kê truy cập. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());

    const roleName = req.user.role?.name;
    if (roles.length > 0 && !roles.includes(roleName)) {
      return next(forbidden('Bạn không có quyền thực hiện thao tác này'));
    }

    return next();
  };
}

module.exports = { authenticate, authorize };
