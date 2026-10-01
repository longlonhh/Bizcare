// Sinh chuỗi QR theo chuẩn EMVCo / NAPAS 247 (VietQR).
// Trả về chuỗi payload có thể render thành ảnh QR ở phía client.
function tlv(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC16-CCITT (0x1021), khởi tạo 0xFFFF — theo spec EMVCo.
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Tạo payload VietQR động.
 * @param {{bankBin:string, accountNumber:string, amount:number, description?:string}} opts
 */
function buildVietQR({ bankBin, accountNumber, amount, description }) {
  const guid = 'A000000727';
  // 38: Merchant Account Information (NAPAS)
  const acquirer = tlv('00', bankBin) + tlv('01', accountNumber);
  const merchant = tlv('00', guid) + tlv('01', acquirer) + tlv('02', 'QRIBFTTA');

  let payload =
    tlv('00', '01') + // Payload Format Indicator
    tlv('01', '12') + // Dynamic QR (có số tiền)
    tlv('38', merchant) +
    tlv('53', '704') + // VND
    tlv('54', String(Math.round(amount || 0))) +
    tlv('58', 'VN');

  if (description) {
    payload += tlv('62', tlv('08', String(description).slice(0, 25)));
  }

  payload += '6304'; // ID + length của CRC
  return payload + crc16(payload);
}

module.exports = { buildVietQR, crc16 };