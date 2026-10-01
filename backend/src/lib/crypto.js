// Mã hóa và giải mã mật khẩu bằng AES-256-GCM.
// Cho phép Admin xem lại mật khẩu của nhân viên khi nhập đúng mật khẩu Admin.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Khóa 256-bit dẫn xuất từ JWT_SECRET
const KEY = crypto.createHash('sha256').update(config.jwtSecret).digest();

/**
 * Mã hóa mật khẩu bằng AES-256-GCM.
 * Định dạng: enc:<iv-hex>:<authTag-hex>:<cipherText-hex>
 */
function encryptPassword(plainText) {
  if (!plainText) return plainText;
  const str = String(plainText);
  if (str.startsWith('enc:')) return str; // Đã mã hóa

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Giải mã mật khẩu đã mã hóa bằng AES-256-GCM.
 * Trả về chuỗi nguyên gốc (plaintext) hoặc chính chuỗi đó nếu là plaintext cũ.
 */
function decryptPassword(storedValue) {
  if (!storedValue) return storedValue;
  const str = String(storedValue);

  if (!str.startsWith('enc:')) {
    // Dữ liệu cũ dạng plaintext
    return str;
  }

  try {
    const parts = str.split(':');
    if (parts.length !== 4) return str;
    const [, ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Lỗi khi giải mã mật khẩu:', err.message);
    return null;
  }
}

/** So sánh hai chuỗi an toàn theo thời gian (timing-safe). */
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Xác thực mật khẩu đăng nhập với mật khẩu lưu trong CSDL.
 * Tương thích cả định dạng mới (enc:...), plaintext cũ và bcrypt hash
 * ($2a$/$2b$/$2y$ — do các phiên bản trước của hệ thống tạo ra).
 */
async function verifyPassword(plainInput, storedValue) {
  if (!plainInput || !storedValue) return false;
  const str = String(storedValue);

  // Mật khẩu cũ dạng bcrypt hash — dùng bcrypt.compare để so khớp
  if (/^\$2[aby]\$/.test(str)) {
    return bcrypt.compare(String(plainInput), str);
  }

  const decrypted = decryptPassword(str);
  if (!decrypted) return false;
  return timingSafeEqual(plainInput, decrypted);
}

module.exports = {
  encryptPassword,
  decryptPassword,
  verifyPassword,
  timingSafeEqual,
};