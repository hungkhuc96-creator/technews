# Bản tin sáng qua Telegram — Design

**Mục tiêu:** Tăng retention. Mỗi sáng gửi 1 bản tin gồm 5 tin công nghệ nóng nhất
24h qua vào một kênh Telegram; mỗi tiêu đề link về web → kéo người đọc quay lại.

## Kiến trúc

GitHub Actions cron (7h sáng VN = 00:00 UTC) chạy `npm run digest`:
1. Lấy các cụm báo chí `status='open'` có bài mới trong 24h, sắp theo `heat_score`.
2. Loại các cụm đã gửi trong 7 ngày (bảng `digest_log`).
3. Chọn top 5 (`selectDigestItems`).
4. Với cụm nào thiếu tóm tắt tiếng Việt → sinh bằng `summarizeClusterById` (Claude).
5. Soạn HTML (`formatTelegram`), gửi qua Telegram Bot API (`sendTelegramMessage`).
6. Ghi 5 cụm đã gửi vào `digest_log`.
Nếu không có tin mới nào → KHÔNG gửi (bỏ qua, không gửi bản tin rỗng).

## Các đơn vị (file)

- `lib/digest/selectItems.ts` — `selectDigestItems(rows, sentIds, limit=5)`: THUẦN, nhận
  danh sách cụm đã kèm title_vi/summary_vi + Set id đã gửi → trả top N chưa gửi.
  Test được không cần DB.
- `lib/digest/formatTelegram.ts` — `formatDigest({date, items}): string`: THUẦN, sinh
  HTML parse_mode Telegram; `escapeHtml` cho `& < >`. Test kỹ escape + bố cục.
- `lib/notify/telegram.ts` — `sendTelegramMessage(token, chatId, html)`: POST tới
  `api.telegram.org/bot{token}/sendMessage`, `parse_mode:'HTML'`,
  `disable_web_page_preview:true`. Ném lỗi nếu `ok:false`.
- `scripts/digest.ts` — ghép các bước 1-6 + `createServiceClient`/`createChat`.
- `supabase/migrations/0006_digest_log.sql` — bảng chống lặp.
- `.github/workflows/digest.yml` — cron ngày + step `if: failure()` mở GitHub Issue
  (giống các workflow khác).

## Dữ liệu

`digest_log(cluster_id uuid primary key references clusters(id) on delete cascade,
sent_at timestamptz default now())`. RLS bật, không policy (chỉ service key ghi,
như các bảng khác).

Mỗi item: `{ titleVi, summary, url }`, `url = https://<host>/tin/{clusterId}`.
Host lấy từ env `SITE_URL` (mặc định production URL) để link không hardcode sai.

## Định dạng tin nhắn (HTML)

```
🔥 <b>nóng — Bản tin công nghệ · {dd/MM}</b>

1. <a href="{url}"><b>{titleVi}</b></a>
{summary rút gọn ~160 ký tự}

… (tối đa 5)

👉 Xem thêm tại nóng: {host}
```

## Lỗi & biên

- Thiếu `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL_ID` → script ném lỗi rõ ràng, workflow
  báo qua Issue.
- < 5 tin mới → gửi số có; 0 tin → bỏ qua, log "không có tin mới".
- Telegram trả `ok:false` (sai token/chat) → ném lỗi (không ghi digest_log để lần sau
  gửi lại).
- Ghi `digest_log` CHỈ sau khi gửi thành công.

## Bảo mật

Token Telegram là secret: chỉ nằm trong GitHub Secrets + `.env.local` (gitignored),
KHÔNG bao giờ trong code. Người dùng tự tạo bot (@BotFather) + kênh, tự dán secret.

## Test

- `formatTelegram.test.ts` (thuần): escape `& < >`, bố cục, cắt summary, 1 vs nhiều tin.
- `selectItems.test.ts` (thuần): loại đã-gửi, giới hạn N, giữ thứ tự heat.
- `telegram.ts`: bọc fetch mỏng — test bằng cách truyền `fetchImpl` giả (không gọi mạng).
- Không thêm test chạm DB thật.

## Ngoài phạm vi (YAGNI)

Không làm: đăng ký/hủy nhận riêng lẻ (kênh Telegram tự lo), video trong digest (giai
đoạn sau), nhiều ngôn ngữ, chọn giờ theo người dùng.
