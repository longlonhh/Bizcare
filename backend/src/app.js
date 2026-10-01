const express = require('express');
const cors = require('cors');

const config = require('./config');
const apiRoutes = require('./routes');
const { requestLogger } = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/error');

// Nạp sẵn mọi model để Mongoose đăng ký trước khi populate được gọi.
require('./models');

const app = express();

app.disable('x-powered-by');

// Ghi log mọi request để theo dõi và gỡ lỗi.
app.use(requestLogger);

app.use(
  cors({
    origin: config.frontendUrl.split(',').map((s) => s.trim()),
    credentials: true,
  }),
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Kiểm tra tình trạng dịch vụ
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'bizcare-api', version: '3.0.0' });
});

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
