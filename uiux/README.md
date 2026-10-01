# BizCare — Giao diện quản trị

Giao diện web của hệ thống BizCare (quản lý doanh thu, kho và tính thuế).
Viết bằng **React 18 + Vite 5 + TailwindCSS 3**, toàn bộ mã nguồn là **JavaScript/JSX** (không dùng TypeScript).

## Chạy giao diện

```bash
npm install
npm run dev      # http://localhost:5173
```

Mọi request `/api/...` được Vite proxy sang backend (mặc định `http://localhost:3000`).
Đổi cổng backend bằng biến môi trường:

```bash
VITE_API_TARGET=http://localhost:3100 npm run dev
```

Cần backend đang chạy (`cd ../backend && npm run dev`) và đã chạy `npm run seed` để có tài khoản demo.

## Đăng nhập thử

| Vai trò | Tài khoản | Mật khẩu |
|---------|-----------|-----------|
| Admin / Chủ DN | admin | admin123 |
| Kế toán | ketoan01 | ketoan123 |
| Thủ kho | kho01 | kho123 |
| Nhân sự | nhanvien01 | ns123 |

## Build production

```bash
npm run build    # xuất ra thư mục dist/
npm run preview  # xem thử bản build
```

## Cấu trúc mã nguồn

```
src/
├── main.jsx              # Điểm khởi động, bọc ThemeProvider + AuthProvider
├── App.jsx               # Khai báo route + chặn truy cập theo vai trò
├── pages/                # Trang theo mô-đun: dashboard, products, inventory,
│                         # purchase-orders, sales-orders, suppliers, customers,
│                         # invoices, tax, reports, employees, attendance, salary, users
├── components/
│   ├── app-shell.jsx     # Khung giao diện: sidebar, header, nút Sáng/Tối, đăng xuất
│   ├── page-parts.jsx    # DataTable, Panel, StatCard, Pill, ErrorBlock...
│   └── ui/               # Button, Input, Label, Dialog, Tabs, Switch, Skeleton
└── lib/
    ├── api.js            # Axios client + toàn bộ hàm gọi API theo phân hệ
    ├── auth.jsx          # AuthContext: đăng nhập, đăng xuất, vai trò hiện tại
    ├── theme.jsx         # ThemeContext: chế độ Sáng/Tối, lưu vào localStorage
    ├── labels.js         # Nhãn tiếng Việt, tông màu trạng thái, quyền xem menu
    ├── format.js         # Định dạng tiền VNĐ, ngày, số
    └── use-resource.js   # Hook nạp dữ liệu kèm loading/error/reload
```

## Ghi chú nghiệp vụ

- **Lịch sử xuất nhập kho** (`/inventory`) lấy dữ liệu thật từ API `GET /inventory/logs`;
  mỗi dòng tương ứng một thao tác nhập kho, xuất kho hoặc kiểm kê đã thực hiện.
- Vai trò không có quyền sẽ thấy thông báo *Không có quyền truy cập* thay vì nội dung phân hệ.
- Nút chuyển **Sáng/Tối** nằm ở góc phải thanh tiêu đề, lựa chọn được ghi nhớ cho lần truy cập sau.
