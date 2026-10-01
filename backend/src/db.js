// Kết nối MongoDB Atlas bằng Mongoose.
const mongoose = require('mongoose');
const config = require('./config');

async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 20000,
  });

  const { host, name } = mongoose.connection;
  console.log(`🍃 Đã kết nối MongoDB Atlas: ${host}/${name}`);

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
