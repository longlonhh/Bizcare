const path = require('path');
// Luôn đọc file backend/.env dù chạy lệnh từ thư mục gốc hay thư mục backend/
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const DEV_SECRET = 'bizcare-dev-secret-key-2024';
const INSECURE_SECRETS = new Set([
  DEV_SECRET,
  'bizcare-secret-key-change-in-production',
  'secret',
  'changeme',
]);

const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv,
  isProduction,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

if (!config.mongoUri) {
  console.error('❌ Thiếu MONGODB_URI trong file backend/.env');
  process.exit(1);
}

// Ở production bắt buộc JWT_SECRET đủ mạnh, không dùng giá trị mặc định/placeholder.
if (isProduction) {
  if (!process.env.JWT_SECRET) {
    console.error('❌ Production yêu cầu biến môi trường JWT_SECRET');
    process.exit(1);
  }
  if (INSECURE_SECRETS.has(config.jwtSecret) || config.jwtSecret.length < 32) {
    console.error(
      '❌ JWT_SECRET quá yếu cho production (cần ≥ 32 ký tự, không dùng giá trị mặc định)',
    );
    process.exit(1);
  }
} else if (INSECURE_SECRETS.has(config.jwtSecret)) {
  console.warn('⚠️  Đang dùng JWT_SECRET mặc định — chỉ phù hợp cho môi trường phát triển.');
}

module.exports = config;
