// Lỗi HTTP có mã trạng thái — tương đương HttpException của NestJS trước đây.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const unauthorized = (message) => new HttpError(401, message || 'Chưa xác thực');
const forbidden = (message) => new HttpError(403, message || 'Không có quyền truy cập');
const notFound = (message) => new HttpError(404, message || 'Không tìm thấy dữ liệu');
const conflict = (message) => new HttpError(409, message);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict };
