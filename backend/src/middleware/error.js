const config = require('../config');

/** Route không khớp. */
function notFoundHandler(req, res) {
  res.status(404).json({
    statusCode: 404,
    message: `Không tìm thấy ${req.method} ${req.originalUrl}`,
  });
}

/** Middleware xử lý lỗi tập trung. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Lỗi máy chủ';

  // Lỗi validate của Mongoose
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join('; ');
  }

  // Lỗi trùng khóa duy nhất (unique index)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    message = field
      ? `Giá trị của "${field}" đã tồn tại, vui lòng chọn giá trị khác`
      : 'Dữ liệu đã tồn tại';
  }

  // Lỗi ép kiểu của Mongoose (CastError)
  if (err.name === 'CastError') {
    status = 400;
    message = `Giá trị không hợp lệ cho trường "${err.path}"`;
  }

  if (status >= 500) {
    console.error('❌', err);
  }

  res.status(status).json({
    statusCode: status,
    message,
    ...(config.nodeEnv === 'development' && status >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
