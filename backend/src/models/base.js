// Hàm tạo Schema dùng chung cho mọi collection.
const { Schema } = require('mongoose');

/**
 * Tạo Schema với cấu hình thống nhất:
 * - `id: false`  : tắt virtual `id` mặc định của Mongoose, nhường chỗ cho cột `id` số tự tăng.
 * - `timestamps` : tự sinh createdAt / updatedAt (giống CreateDateColumn / UpdateDateColumn cũ).
 * - `toJSON`     : trả virtuals (quan hệ populate) và ẩn `_id`.
 */
function createSchema(definition, options = {}) {
  const schema = new Schema(definition, {
    id: false,
    versionKey: false,
    timestamps: true,
    ...options,
  });

  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      return ret;
    },
  });

  return schema;
}

/** Trường `id` số tự tăng dùng cho mọi collection. */
const idField = { type: Number, unique: true, index: true };

/** Trường khóa ngoại số (tham chiếu tới `id` của collection khác). */
const refField = (ref) => ({ type: Number, index: true, ref });

/** Khai báo quan hệ populate một-nhiều dựa trên `id` số. */
function virtualRef(schema, { path, ref, localField, foreignField }) {
  schema.virtual(path, { ref, localField, foreignField, justOne: true });
}

module.exports = { createSchema, idField, refField, virtualRef };
