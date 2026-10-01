// Nạp toàn bộ model để Mongoose đăng ký tên model trước khi dùng populate().
module.exports = {
  Role: require('./role'),
  User: require('./user'),
  Product: require('./product'),
  Supplier: require('./supplier'),
  Customer: require('./customer'),
  PurchaseOrder: require('./purchaseOrder'),
  SalesOrder: require('./salesOrder'),
  InventoryLog: require('./inventoryLog'),
  Invoice: require('./invoice'),
  Employee: require('./employee'),
  Attendance: require('./attendance'),
  Salary: require('./salary'),
  TaxRecord: require('./taxRecord'),
};
