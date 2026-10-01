// Đăng ký toàn bộ route của hệ thống dưới tiền tố /api/v1.
const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/roles', require('./roles'));
router.use('/users', require('./users'));
router.use('/products', require('./products'));
router.use('/suppliers', require('./suppliers'));
router.use('/customers', require('./customers'));
router.use('/purchase-orders', require('./purchase-orders'));
router.use('/sales-orders', require('./sales-orders'));
router.use('/inventory', require('./inventory'));
router.use('/invoices', require('./invoices'));
router.use('/tax', require('./tax'));
router.use('/reports', require('./reports'));
router.use('/employees', require('./employees'));
router.use('/attendance', require('./attendance'));
router.use('/salaries', require('./salaries'));

// Mục lục API thay cho trang Swagger trước đây.
router.get('/', (_req, res) => {
  res.json({
    name: 'BizCare API',
    version: '3.0.0',
    database: 'MongoDB Atlas',
    endpoints: {
      auth: [
        'POST   /api/v1/auth/register',
        'POST   /api/v1/auth/login',
        'POST   /api/v1/auth/request-otp',
        'POST   /api/v1/auth/reset-password',
        'POST   /api/v1/auth/users',
        'GET    /api/v1/auth/users',
        'POST   /api/v1/auth/users/:id/update',
        'POST   /api/v1/auth/users/:id/deactivate',
        'POST   /api/v1/auth/users/:id/delete',
      ],
      catalog: [
        'GET    /api/v1/roles',
        'GET    /api/v1/users/me',
        'GET|POST|PUT|DELETE /api/v1/products',
        'GET    /api/v1/products/barcode/:barcode',
        'GET|POST|PUT|DELETE /api/v1/suppliers',
        'GET|POST|PUT|DELETE /api/v1/customers',
        'GET|POST|PUT|DELETE /api/v1/employees',
      ],
      inventory: [
        'GET    /api/v1/inventory/summary',
        'GET    /api/v1/inventory/logs            (lịch sử xuất nhập toàn kho)',
        'GET    /api/v1/inventory/logs/:productId',
        'POST   /api/v1/inventory/adjust',
        'GET    /api/v1/inventory/low-stock',
      ],
      orders: [
        'GET|POST /api/v1/purchase-orders',
        'GET|POST /api/v1/sales-orders',
        'POST   /api/v1/purchase-orders/:id/confirm   (nhập kho)',
        'POST   /api/v1/sales-orders/:id/confirm      (xuất kho)',
      ],
      finance: [
        'GET|POST /api/v1/invoices',
        'POST   /api/v1/invoices/create-from-order/:salesOrderId',
        'GET    /api/v1/invoices/:id/vietqr',
        'POST   /api/v1/tax/household',
        'POST   /api/v1/tax/vat',
        'POST   /api/v1/tax/cit',
        'GET    /api/v1/tax/records',
        'POST   /api/v1/tax/export-xml',
        'GET    /api/v1/reports/pnl',
        'GET    /api/v1/reports/dashboard',
      ],
      hr: [
        'GET    /api/v1/attendance',
        'GET    /api/v1/attendance/summary',
        'POST   /api/v1/salaries/calculate',
        'POST   /api/v1/salaries/calculate-all',
        'GET    /api/v1/salaries',
      ],
    },
  });
});

module.exports = router;
