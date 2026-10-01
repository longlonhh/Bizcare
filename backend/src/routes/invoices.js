// Hoá đơn bán lẻ / hoá đơn điện tử và mã VietQR.
const express = require('express');

const Invoice = require('../models/invoice');
const SalesOrder = require('../models/salesOrder');
const { InvoiceType, InvoiceStatus, SalesOrderStatus, RoleName } = require('../models/enums');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, formatCode } = require('../lib/helpers');
const { nextId } = require('../lib/id');
const { buildVietQR } = require('../lib/vietqr');
const { notFound, badRequest } = require('../lib/errors');

const router = express.Router();
router.use(authenticate);

const canManage = authorize(RoleName.ADMIN, RoleName.ACCOUNTANT);

async function findOrFail(id) {
  const invoice = await Invoice.findOne({ id }).populate('salesOrder');
  if (!invoice) throw notFound('Không tìm thấy hóa đơn');
  return invoice;
}

router.post(
  '/create-from-order/:salesOrderId',
  canManage,
  asyncHandler(async (req, res) => {
    const salesOrderId = Number(req.params.salesOrderId);
    // Chấp nhận `type` từ query (?type=) hoặc body để tránh lệch hợp đồng giữa client và server.
    const type = req.query.type || (req.body && req.body.type) || InvoiceType.RETAIL;

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      throw badRequest('Mã phiếu xuất không hợp lệ');
    }

    if (!Object.values(InvoiceType).includes(type)) {
      throw badRequest(`Loại hóa đơn không hợp lệ: "${type}"`);
    }

    const so = await SalesOrder.findOne({ id: salesOrderId }).populate('customer');
    if (!so) throw notFound('Không tìm thấy phiếu xuất');
    if (so.status !== SalesOrderStatus.COMPLETED) {
      throw badRequest('Phiếu xuất phải hoàn thành trước khi tạo hóa đơn');
    }

    const existing = await Invoice.findOne({ salesOrderId: so.id });
    if (existing) throw badRequest('Hóa đơn đã tồn tại cho phiếu xuất này');

    const seq = await nextId('invoices');
    const prefix = type === InvoiceType.RETAIL ? 'HDBL' : 'HDDT';

    const invoice = await Invoice.create({
      id: seq,
      code: formatCode(prefix, seq),
      salesOrderId: so.id,
      type,
      status: InvoiceStatus.DRAFT,
      totalAmount: so.totalAmount,
      totalVat: so.totalVat,
      grandTotal: so.grandTotal,
      customerName: so.customer?.name || 'Khách lẻ',
      customerTaxCode: so.customer?.taxCode || null,
      customerPhone: so.customer?.phone || null,
      customerEmail: so.customer?.email || null,
    });

    res.status(201).json({ message: 'Tạo hóa đơn thành công', invoice: invoice.toJSON() });
  }),
);

router.get(
  '/',
  canManage,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
    res.json(invoices.map((i) => i.toJSON()));
  }),
);

router.get(
  '/:id',
  canManage,
  asyncHandler(async (req, res) => {
    res.json((await findOrFail(Number(req.params.id))).toJSON());
  }),
);

router.post(
  '/:id/issue',
  canManage,
  asyncHandler(async (req, res) => {
    const invoice = await findOrFail(Number(req.params.id));
    invoice.status = InvoiceStatus.ISSUED;
    await invoice.save();
    res.json({ message: 'Hóa đơn đã được phát hành', invoice: invoice.toJSON() });
  }),
);

router.get(
  '/:id/vietqr',
  canManage,
  asyncHandler(async (req, res) => {
    const invoice = await findOrFail(Number(req.params.id));

    const bankBin = process.env.VIETQR_BANK_BIN || '970436'; // mặc định Vietcombank
    const bankAccount = process.env.VIETQR_BANK_ACCOUNT || 'YOUR_BANK_ACCOUNT';
    const bankName = process.env.VIETQR_BANK_NAME || 'YOUR_BANK_NAME';

    // Payload EMVCo/NAPAS chuẩn — client render thành ảnh QR.
    const qrData = buildVietQR({
      bankBin,
      accountNumber: bankAccount,
      amount: invoice.grandTotal,
      description: invoice.code,
    });

    // Link ảnh VietQR QuickLink chuẩn kết hợp payload EMVCo
    const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${bankAccount}-compact.png?amount=${Math.round(invoice.grandTotal || 0)}&addInfo=${encodeURIComponent(invoice.code || '')}`;

    res.json({
      invoiceId: invoice.id,
      amount: invoice.grandTotal,
      bankBin,
      bankAccount,
      bankName,
      qrData,
      qrImageUrl,
      message: 'Quét mã QR để thanh toán',
    });
  }),
);

router.delete(
  '/:id',
  authorize(RoleName.ADMIN),
  asyncHandler(async (req, res) => {
    const invoice = await findOrFail(Number(req.params.id));
    if (invoice.status === InvoiceStatus.ISSUED) {
      throw badRequest('Không thể xóa hóa đơn đã phát hành');
    }
    await invoice.deleteOne();
    res.json({ message: 'Đã xóa hóa đơn' });
  }),
);

module.exports = router;
