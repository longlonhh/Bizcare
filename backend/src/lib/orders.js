// Gắn thông tin sản phẩm hiện tại vào từng dòng hàng của phiếu nhập/xuất.
// API cũ trả `items[].product`, nên giữ đúng cấu trúc đó.
const Product = require('../models/product');

async function attachItemProducts(input) {
  const isArray = Array.isArray(input);
  const orders = (isArray ? input : [input])
    .filter(Boolean)
    .map((o) => (typeof o.toJSON === 'function' ? o.toJSON() : o));

  const productIds = new Set();
  for (const order of orders) {
    for (const item of order.items || []) {
      if (item.productId != null) productIds.add(item.productId);
    }
  }

  if (productIds.size > 0) {
    const products = await Product.find({ id: { $in: [...productIds] } });
    const byId = new Map(products.map((p) => [p.id, p.toJSON()]));

    for (const order of orders) {
      for (const item of order.items || []) {
        const product = byId.get(item.productId) || null;
        item.product = product;
        if (!item.productCode && product) item.productCode = product.code;
        if (!item.productName && product) item.productName = product.name;
      }
    }
  }

  return isArray ? orders : orders[0];
}

module.exports = { attachItemProducts };
