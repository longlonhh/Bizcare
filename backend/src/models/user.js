const mongoose = require('mongoose');
const { createSchema, idField, refField, virtualRef } = require('./base');
const { UserStatus, values } = require('./enums');
const { autoIdPlugin } = require('../lib/id');
const { encryptPassword } = require('../lib/crypto');

// Mật khẩu được mã hóa an toàn bằng AES-256-GCM trước khi lưu.
const userSchema = createSchema({
  id: idField,
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  // SĐT/email chỉ là thông tin liên hệ — được phép bỏ trống hoặc trùng nhau.
  phone: { type: String, default: '', trim: true, index: true },
  email: { type: String, default: null, trim: true, lowercase: true },
  status: { type: String, enum: values(UserStatus), default: UserStatus.ACTIVE },
  isPhoneVerified: { type: Boolean, default: false },
  roleId: refField('Role'),
  createdBy: { type: Number, default: null },
});

// Quan hệ users.roleId -> roles.id (giữ nguyên `role` là object như API cũ).
virtualRef(userSchema, { path: 'role', ref: 'Role', localField: 'roleId', foreignField: 'id' });

// Tự động mã hóa mật khẩu trước khi lưu (nếu chưa có tiền tố enc:).
userSchema.pre('save', function (next) {
  if (this.isModified('password') && this.password && !this.password.startsWith('enc:')) {
    this.password = encryptPassword(this.password);
  }
  next();
});

// Luôn ẩn mật khẩu khi chuyển sang JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret._id;
    delete ret.password;
    return ret;
  },
});

userSchema.plugin(autoIdPlugin('users'));

module.exports = mongoose.model('User', userSchema);
