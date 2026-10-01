// Kiểm thử đơn vị cho các hàm thuần (không cần DB): thuế, VietQR, helpers.
// Chạy: npm test
const test = require('node:test');
const assert = require('node:assert');

const { computeCit, computeVat, computeHouseholdTax, resolveCitTier } = require('../src/lib/tax');
const { buildVietQR, crc16 } = require('../src/lib/vietqr');
const { formatCode, lastDayOfMonth, firstDayOfMonth } = require('../src/lib/helpers');

test('resolveCitTier chọn đúng mức thuế suất theo doanh thu', () => {
  assert.strictEqual(resolveCitTier(1_000_000_000).rate, 15);
  assert.strictEqual(resolveCitTier(10_000_000_000).rate, 17);
  assert.strictEqual(resolveCitTier(100_000_000_000).rate, 20);
});

test('computeCit: thu nhập chịu thuế = doanh thu - COGS - lương', () => {
  const r = computeCit({ totalRevenue: 1_000_000_000, cogs: 400_000_000, totalSalary: 100_000_000 });
  assert.strictEqual(r.taxableIncome, 500_000_000);
  assert.strictEqual(r.tier.rate, 15);
  assert.strictEqual(r.citAmount, 75_000_000);
});

test('computeCit: lỗ thì thuế = 0', () => {
  const r = computeCit({ totalRevenue: 100, cogs: 200, totalSalary: 0 });
  assert.strictEqual(r.taxableIncome, 0);
  assert.strictEqual(r.citAmount, 0);
});

test('computeVat: khấu trừ, không âm', () => {
  assert.strictEqual(computeVat({ vatOutput: 100, vatInput: 40 }).vatPayable, 60);
  assert.strictEqual(computeVat({ vatOutput: 30, vatInput: 50 }).vatPayable, 0);
});

test('computeHouseholdTax: bán lẻ 1% GTGT + 0.5% TNCN', () => {
  const r = computeHouseholdTax({ totalRevenue: 100_000_000, businessType: 'wholesale_retail' });
  assert.strictEqual(r.vatAmount, 1_000_000);
  assert.strictEqual(r.pitAmount, 500_000);
  assert.strictEqual(r.totalTax, 1_500_000);
});

test('crc16 trả về 4 ký tự hex', () => {
  assert.match(crc16('123456789'), /^[0-9A-F]{4}$/);
});

test('buildVietQR tạo payload EMVCo có CRC hợp lệ', () => {
  const qr = buildVietQR({
    bankBin: '970436',
    accountNumber: '1234567890',
    amount: 250000,
    description: 'HDBL000001',
  });
  assert.ok(qr.startsWith('000201'));
  assert.ok(qr.includes('970436'));
  assert.ok(qr.includes('250000'));
  // CRC là 4 ký tự cuối và khớp với phần payload trước đó.
  const body = qr.slice(0, -4);
  assert.strictEqual(qr.slice(-4), crc16(body));
});

test('helpers: formatCode và ngày tháng', () => {
  assert.strictEqual(formatCode('PN', 1), 'PN000001');
  assert.strictEqual(firstDayOfMonth(2024, 3), '2024-03-01');
  assert.strictEqual(lastDayOfMonth(2024, 2), '2024-02-29'); // năm nhuận
});

const { encryptPassword, decryptPassword, verifyPassword } = require('../src/lib/crypto');

test('crypto: mã hóa AES-256-GCM và giải mã chính xác', async () => {
  const plain = 'SecretPassword123!';
  const encrypted = encryptPassword(plain);
  assert.ok(encrypted.startsWith('enc:'));
  assert.notStrictEqual(encrypted, plain);

  const decrypted = decryptPassword(encrypted);
  assert.strictEqual(decrypted, plain);

  assert.strictEqual(await verifyPassword(plain, encrypted), true);
  assert.strictEqual(await verifyPassword('WrongPassword', encrypted), false);
});