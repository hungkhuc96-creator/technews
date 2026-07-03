# nóng — bản tin công nghệ

Trình tổng hợp tin công nghệ (Next.js App Router + TypeScript + Supabase), tóm tắt tiếng Việt bằng AI.

## Chạy test (DB test riêng)

Test tích hợp **không** chạy trên DB production. Chúng chạy trên một project Supabase
riêng — `hot tech news TEST` (`cewbyshwtfwcpbesapnz`) — được dựng từ đúng bộ migration
trong `supabase/migrations/`. Nhờ vậy một câu `.delete()` sai bộ lọc cũng không thể
đụng tới dữ liệu thật.

`vitest.setup.ts` **bắt buộc** phải có 2 biến này, thiếu là từ chối chạy toàn bộ test:

| Biến | Ý nghĩa |
|------|---------|
| `SUPABASE_URL_TEST`         | URL của project test |
| `SUPABASE_SERVICE_KEY_TEST` | Key của project test (RLS đang tắt nên anon key là đủ) |

Khi có, setup **ghi đè** `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` bằng bản `_TEST`, nên mọi
`createServiceClient()` trong test tự trỏ vào DB test — không cần sửa từng file test.

- **Chạy ở máy:** 2 biến này đã có sẵn trong `.env.local` (file này KHÔNG commit).
  Chỉ cần `npm test`.
- **Chạy trên CI (GitHub Actions):** cần thêm 2 **Repository secret** cùng tên
  (`SUPABASE_URL_TEST`, `SUPABASE_SERVICE_KEY_TEST`) tại
  *Settings → Secrets and variables → Actions*. Lấy giá trị trong Supabase Dashboard
  của project test → *Project Settings → API* (URL) và *API Keys → anon/public* (key).
  Job test cố tình **không** có secret production → không đường nào chạm tới dữ liệu thật.

```bash
npm test          # chạy 1 lần
npm run test:watch # chạy liên tục khi sửa code
```

## Đồng bộ cấu trúc DB

Khi thêm migration mới vào `supabase/migrations/`, nhớ chạy nó cho **cả hai** project
(production và test) để lược đồ luôn khớp — nếu không, test sẽ đỏ vì thiếu cột/bảng.
