import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    // Các test tích hợp dùng chung 1 database đám mây → chạy tuần tự để không giẫm chân nhau.
    fileParallelism: false,
    // Hook dọn dữ liệu chạy trên DB đám mây (chậm dần khi DB lớn) → nới thời gian chờ.
    hookTimeout: 60_000,
  },
});
