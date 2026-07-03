import { existsSync } from 'node:fs';

// Nạp biến môi trường từ .env.local cho các test cần kết nối Supabase.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

// ───────────────────────────────────────────────────────────────────────────
// AN TOÀN: test PHẢI chạy trên DB test riêng (project "hot tech news TEST"),
// TUYỆT ĐỐI không đụng vào DB production. Nhiều test xóa/ghi thẳng dữ liệu bằng
// createServiceClient() — nếu lỡ trỏ vào production là mất dữ liệu thật (đã cháy 2 lần).
//
// Cơ chế: bắt buộc phải có SUPABASE_URL_TEST + SUPABASE_SERVICE_KEY_TEST.
//   • Thiếu           → NÉM LỖI, dừng toàn bộ test (thà "đỏ" còn hơn xóa nhầm).
//   • Trùng production → NÉM LỖI (phải là 2 project khác nhau).
//   • Hợp lệ          → ghi đè SUPABASE_URL/KEY bằng bản _TEST, nên MỌI
//     createServiceClient() trong test tự trỏ vào DB test — không cần sửa từng file.
// ───────────────────────────────────────────────────────────────────────────
const testUrl = process.env.SUPABASE_URL_TEST;
const testKey = process.env.SUPABASE_SERVICE_KEY_TEST;

if (!testUrl || !testKey) {
  throw new Error(
    'Test bị chặn: thiếu SUPABASE_URL_TEST / SUPABASE_SERVICE_KEY_TEST.\n' +
      'Test CHỈ được chạy trên DB test riêng để không xóa nhầm dữ liệu production.\n' +
      'Xem README mục "Chạy test (DB test riêng)" để biết cách lấy 2 biến này.',
  );
}
if (process.env.SUPABASE_URL && testUrl === process.env.SUPABASE_URL) {
  throw new Error(
    'Test bị chặn: SUPABASE_URL_TEST trùng với SUPABASE_URL (production). ' +
      'Phải là 2 project Supabase khác nhau.',
  );
}

// Từ đây, mọi kết nối DB trong test đều là DB test.
process.env.SUPABASE_URL = testUrl;
process.env.SUPABASE_SERVICE_KEY = testKey;
