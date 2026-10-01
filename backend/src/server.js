// Điểm khởi động backend BizCare.
const app = require('./app');
const config = require('./config');
const { connectDB } = require('./db');

async function bootstrap() {
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Không kết nối được MongoDB Atlas:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`🚀 BizCare API đang chạy tại http://localhost:${config.port}`);
    console.log(`📚 Danh mục API tại http://localhost:${config.port}/api/v1`);
  });

  // Tắt gọn gàng khi nhận tín hiệu dừng
  const shutdown = (signal) => {
    console.log(`\n${signal} — đang dừng máy chủ...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap();
