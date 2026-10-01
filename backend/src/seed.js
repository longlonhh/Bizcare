/**
 * Seed dữ liệu nền: 4 vai trò và 4 tài khoản demo.
 *
 * LƯU Ý: script này KHÔNG tạo dữ liệu nghiệp vụ (sản phẩm, phiếu nhập/xuất,
 * lịch sử kho...). Toàn bộ số liệu nghiệp vụ phải phát sinh từ thao tác thật
 * trên giao diện để lịch sử kho luôn phản ánh đúng thực tế.
 *
 * Chạy: npm run seed
 */
const { connectDB, disconnectDB } = require('./db');
const Role = require('./models/role');
const User = require('./models/user');
const { RoleName, UserStatus } = require('./models/enums');

const ROLES = [
  {
    name: RoleName.ADMIN,
    description: 'Admin / Chủ doanh nghiệp - Quyền hạn tối cao',
    permissions: ['*'],
  },
  {
    name: RoleName.ACCOUNTANT,
    description: 'Kế toán - Quản lý hóa đơn, báo cáo, thuế',
    permissions: ['invoices', 'reports', 'tax', 'customers'],
  },
  {
    name: RoleName.WAREHOUSE,
    description: 'Nhân viên Xuất/Nhập hàng - Quản lý kho',
    permissions: ['products', 'purchase-orders', 'sales-orders', 'inventory'],
  },
  {
    name: RoleName.HR,
    description: 'Nhân sự - Quản lý nhân viên, chấm công, lương',
    permissions: ['employees', 'attendance', 'salaries'],
  },
];

// Mật khẩu demo — sẽ được hook pre('save') của User băm một chiều bằng bcrypt.
const DEMO_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    fullName: 'Admin BizCare',
    phone: '0900000000',
    email: 'admin@bizcare.vn',
    role: RoleName.ADMIN,
  },
  {
    username: 'ketoan01',
    password: 'ketoan123',
    fullName: 'Nguyễn Thị Kế Toán',
    phone: '0901111111',
    email: 'ketoan@bizcare.vn',
    role: RoleName.ACCOUNTANT,
  },
  {
    username: 'kho01',
    password: 'kho123',
    fullName: 'Trần Văn Thủ Kho',
    phone: '0902222222',
    email: 'kho@bizcare.vn',
    role: RoleName.WAREHOUSE,
  },
  {
    username: 'nhanvien01',
    password: 'ns123',
    fullName: 'Lê Thị Nhân Sự',
    phone: '0903333333',
    email: 'ns@bizcare.vn',
    role: RoleName.HR,
  },
];

async function seed() {
  await connectDB();

  for (const roleData of ROLES) {
    const existing = await Role.findOne({ name: roleData.name });
    if (existing) {
      console.log(`⏭️  Vai trò đã tồn tại: ${roleData.name}`);
      continue;
    }
    await Role.create(roleData);
    console.log(`✅ Đã tạo vai trò: ${roleData.name}`);
  }

  for (const userData of DEMO_USERS) {
    const existing = await User.findOne({ username: userData.username });
    if (existing) {
      console.log(`⏭️  Tài khoản đã tồn tại: ${userData.username}`);
      continue;
    }

    const role = await Role.findOne({ name: userData.role });

    await User.create({
      username: userData.username,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone,
      email: userData.email,
      roleId: role?.id ?? null,
      isPhoneVerified: true,
      status: UserStatus.ACTIVE,
    });

    console.log(`✅ Đã tạo tài khoản: ${userData.username} / ${userData.password}`);
  }

  console.log('\n🎉 Seed hoàn tất!');
  await disconnectDB();
}

seed().catch(async (err) => {
  console.error('❌ Seed thất bại:', err);
  await disconnectDB();
  process.exit(1);
});
