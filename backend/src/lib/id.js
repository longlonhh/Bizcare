// Bộ đếm ID số tự tăng — thay thế AUTO_INCREMENT của MySQL trước đây.
// Mỗi collection có 1 document: { _id: 'users', seq: 42 }
const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

const Counter = mongoose.model('Counter', counterSchema);

/**
 * Lấy ID kế tiếp cho một collection (đã tăng seq).
 * Tự nhảy qua các id đã tồn tại (phòng khi bộ đếm lệch với dữ liệu cũ).
 */
async function nextId(collection) {
  const col = mongoose.connection.collection(collection);
  for (let attempt = 0; attempt < 20; attempt++) {
    const counter = await Counter.findByIdAndUpdate(
      collection,
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );
    const exists = await col.findOne({ id: counter.seq }, { projection: { _id: 1 } });
    if (!exists) return counter.seq;
  }
  throw new Error(`Không sinh được id mới cho collection "${collection}"`);
}

/**
 * Lấy một DẢI ID liên tiếp cho collection trong một lần gọi DB duy nhất.
 * Dùng khi tạo nhiều dòng hàng để tránh N+1 round-trip.
 */
async function nextIds(collection, count) {
  if (!count || count <= 0) return [];
  const counter = await Counter.findByIdAndUpdate(
    collection,
    { $inc: { seq: count } },
    { new: true, upsert: true },
  );
  const first = counter.seq - count + 1;
  return Array.from({ length: count }, (_, i) => first + i);
}

/** Mongoose plugin: tự gán `id` số tự tăng khi tạo document mới. */
function autoIdPlugin(collection) {
  return function (schema) {
    schema.pre('save', async function assignAutoId() {
      if (this.isNew && (this.id === undefined || this.id === null)) {
        this.id = await nextId(collection);
      }
    });
  };
}

module.exports = { nextId, nextIds, autoIdPlugin };
