# 🏢 BizCare — Business Care

**Chăm sóc toàn diện cho doanh nghiệp** — Hệ thống Quản lý Doanh thu, Kho và Tính Thuế cho doanh nghiệp SMEs và hộ kinh doanh tại Việt Nam.

## 📋 Tính năng chính

### 🔐 Phân quyền người dùng (RBAC)
- **Admin / Chủ DN**: quyền hạn tối cao, quản lý tài khoản nhân viên
- **Kế toán**: hóa đơn, báo cáo, thuế, khách hàng
- **Nhân viên Kho**: nhập/xuất hàng, sản phẩm, tồn kho
- **Nhân sự**: hồ sơ nhân viên, chấm công, bảng lương
- Mật khẩu **băm một chiều bằng bcrypt** (không thể giải ngược), hỗ trợ người dùng tự đổi mật khẩu
- **Giới hạn tần suất (rate-limit)** cho các endpoint đăng nhập / OTP / đặt lại mật khẩu

### 📦 Quản lý Kho & Nhập hàng
- Phiếu nhập hàng chi tiết: mã SP, số lượng, giá nhập, VAT đầu vào
- Tự động cộng tồn kho và tính **giá vốn bình quân gia quyền** khi xác nhận nhập kho
- Phiếu xuất hàng kiểm tra & trừ tồn kho, chặn bán vượt tồn
- **Lịch sử xuất – nhập kho lấy 100% từ thao tác thật**: mỗi bản ghi sinh ra khi nhập kho, xuất kho hoặc kiểm kê (không có dữ liệu chèn sẵn trong code)

### 🛒 Hóa đơn & Thanh toán
- Tạo hóa đơn bán lẻ / hóa đơn điện tử VAT từ phiếu xuất đã xuất kho
- Sinh **mã VietQR động chuẩn EMVCo / NAPAS 247** (payload TLV + CRC16) theo số tiền hóa đơn

### 💰 Động cơ Tính Thuế tự động
- **Hộ kinh doanh**: thuế khoán theo doanh thu
- **DN SMEs (GTGT)**: khấu trừ = đầu ra − đầu vào
- **DN SMEs (TNDN)**: thuế suất theo mức doanh thu
- Lưu kết quả kê khai và xuất XML phục vụ nộp thuế

### 📊 Báo cáo & Dashboard
- P&L theo tháng / quý / năm: doanh thu thuần, COGS, lợi nhuận gộp, lãi ròng
- Dashboard lấy số liệu trực tiếp từ chứng từ đã phát sinh

### 🌗 Giao diện
- **Chế độ Sáng / Tối** chuyển ngay trên thanh tiêu đề, ghi nhớ lựa chọn trong `localStorage`

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Giao diện | React 18 + Vite 5 + TailwindCSS 3 (JavaScript) |
| Backend | Node.js 18+ + Express 4 + Mongoose 8 |
| Auth | JWT + OTP SMS |
| Database | MongoDB Atlas |

## 🚀 Hướng dẫn cài đặt

### 1. Backend

```bash
cd backend
npm install

# Cấu hình kết nối (mở file và dán chuỗi kết nối Atlas của bạn)
cp .env.example .env

npm run seed     # Tạo 4 vai trò + 4 tài khoản demo
npm run dev      # API tại http://localhost:3000
```

File `backend/.env` cần tối thiểu:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bizcare?retryWrites=true&w=majority
# BẮT BUỘC ở production: khóa riêng ≥ 32 ký tự, không dùng giá trị mặc định.
# Sinh khóa: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
JWT_SECRET=bizcare-secret-key-change-in-production
PORT=3000
```

Chạy kiểm thử đơn vị (động cơ thuế, VietQR, helpers):

```bash
cd backend
npm test
```

### 2. Giao diện

```bash
cd uiux
npm install
npm run dev      # http://localhost:5173 (tự proxy /api sang cổng 3000)
```

Nếu backend chạy ở cổng khác: `VITE_API_TARGET=http://localhost:3100 npm run dev`.

## 👤 Tài khoản Demo

| Vai trò | Tên đăng nhập | Mật khẩu |
|---------|---------------|-----------|
| Admin / Chủ DN | admin | admin123 |
| Kế toán | ketoan01 | ketoan123 |
| Thủ kho | kho01 | kho123 |
| Nhân sự | nhanvien01 | ns123 |

## 📂 Cấu trúc dự án

```
BizCare/
├── backend/                     # REST API (Express + Mongoose, JavaScript)
│   ├── src/
│   │   ├── models/              # Schema Mongoose: user, product, purchaseOrder, inventoryLog...
│   │   ├── routes/              # auth, users, products, suppliers, customers, purchase-orders,
│   │   │                        # sales-orders, inventory, invoices, tax, reports, employees,
│   │   │                        # attendance, salaries
│   │   ├── middleware/          # authenticate + authorize (RBAC), error handler
│   │   ├── lib/                 # helpers, ID tự tăng, tổng hợp số liệu, nghiệp vụ
│   │   ├── app.js               # Khai báo Express app
│   │   ├── server.js            # Điểm khởi động
│   │   └── seed.js              # Seed vai trò + tài khoản demo
│   └── .env.example
├── uiux/                        # Giao diện quản trị (React + Vite, JavaScript)
│   └── src/
│       ├── pages/               # Trang theo mô-đun nghiệp vụ
│       ├── components/          # AppShell, DataTable, Panel... và UI primitives
│       └── lib/                 # api client (axios), auth, theme, format, labels
└── README.md
```

## 📡 API Endpoints (tiền tố `/api/v1`)

### Auth
- `POST /auth/login` — đăng nhập, nhận JWT
- `POST /auth/register` — đăng ký chủ doanh nghiệp
- `POST /auth/request-otp`, `POST /auth/reset-password` — quên mật khẩu qua OTP

### Users (Admin)
- `GET /auth/users`, `POST /auth/users`
- `POST /auth/users/:id/deactivate`, `POST /auth/users/:id/delete`

### Kho & Hàng hóa
- `GET|POST|PUT|DELETE /products`
- `GET /purchase-orders`, `POST /purchase-orders`, `POST /purchase-orders/:id/confirm` — xác nhận nhập kho
- `GET /sales-orders`, `POST /sales-orders`, `POST /sales-orders/:id/confirm` — xác nhận xuất kho
- `GET /inventory/summary` — tổng quan tồn kho
- `GET /inventory/logs` — **toàn bộ lịch sử xuất/nhập/kiểm kê (dữ liệu thật)**
- `GET /inventory/logs/:productId` — lịch sử theo sản phẩm
- `POST /inventory/adjust` — kiểm kê điều chỉnh tồn (Admin)
- `GET /inventory/low-stock` — cảnh báo dưới định mức

### Đối tác
- `GET|POST|PUT|DELETE /suppliers` (Admin)
- `GET|POST|PUT|DELETE /customers`

### Hóa đơn & Thuế
- `GET /invoices`, `POST /invoices/create-from-order/:salesOrderId`, `POST /invoices/:id/issue`
- `GET /invoices/:id/vietqr`
- `POST /tax/household`, `POST /tax/vat`, `POST /tax/cit`, `GET /tax/records`, `POST /tax/export-xml`

### Nhân sự
- `GET|POST|PUT|DELETE /employees`
- `GET|POST /attendance`, `GET /attendance/summary`
- `GET /salaries`, `POST /salaries/calculate`, `POST /salaries/calculate-all`

### Báo cáo
- `GET /reports/pnl` — báo cáo lãi/lỗ (Admin, Kế toán)
- `GET /reports/dashboard` — số liệu tổng quan

---

📝 **Phiên bản**: 3.0.0 · Express + Mongoose + MongoDB Atlas · JavaScript thuần
