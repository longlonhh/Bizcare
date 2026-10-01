// Ghi log mỗi request: phương thức, đường dẫn, mã trạng thái, thời gian xử lý.
// Nhẹ, không phụ thuộc thư viện ngoài; đủ để theo dõi và gỡ lỗi.
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const time = new Date().toISOString();
    const line = `${time} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`;
    if (res.statusCode >= 500) console.error(`❌ ${line}`);
    else if (res.statusCode >= 400) console.warn(`⚠️  ${line}`);
    else console.log(`➡️  ${line}`);
  });

  next();
}

module.exports = { requestLogger };