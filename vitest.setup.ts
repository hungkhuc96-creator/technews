import { existsSync } from 'node:fs';

// Nạp biến môi trường từ .env.local cho các test cần kết nối Supabase.
if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}
