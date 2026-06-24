# Thiết kế: "nóng" — Feed tin công nghệ tổng hợp (kiểu mạng xã hội)

**Ngày:** 2026-06-23
**Trạng thái:** Bản thiết kế v1 — chờ duyệt

---

## 1. Mục tiêu

Một website tin công nghệ kiểu mạng xã hội, tổng hợp **tin nước ngoài** từ nhiều
nguồn, gom các tin nói về cùng một sự kiện thành cụm (kiểu Google News), tóm tắt
bằng AI ra tiếng Việt, và xếp theo độ nóng để **người dùng lướt vài phút là nắm
được hôm nay thế giới công nghệ có gì hot** — đồng thời tương tác được (bình luận).

**Tiêu chí thành công:** Mở trang chủ → trong ~30 giây người đọc thấy được các sự
kiện công nghệ quan trọng/đang nóng nhất hôm nay, mỗi tin tóm tắt 2–3 câu tiếng
Việt dạng bullet, biết có bao nhiêu nguồn đưa tin, và bình luận được.

---

## 2. Phạm vi

### Trong phạm vi v1
- Nguồn: **Báo chí (RSS)**, **YouTube (Data API)**, **Reddit (API)**, **X (qua Apify)**, **TikTok (qua Apify)**.
- Gom cụm sự kiện (dedup + đếm số nguồn).
- Xếp độ nóng (cơ chế đơn giản — xem §5).
- Tóm tắt AI ra tiếng Việt (2–3 câu, bullet) ở **cấp cụm**.
- Feed web 3 cột theo mockup, lọc theo nguồn/chủ đề.
- Đăng nhập + bình luận.
- Cập nhật gần-thời-gian-thực (banner "↑ N tin mới").

### Hoãn sang v2 (đã bàn, cố tình để sau)
- **Gia tốc / baseline / snapshot định kỳ** cho YouTube/Reddit/TikTok (phát hiện
  "đột biến" của kênh nhỏ). Cần hạ tầng đo time-series → để v2.
- **Cá nhân hóa** ("Feed của tôi") và theo dõi nguồn.
- **Dịch nguyên bài gốc** của báo chí (xem §8 — rủi ro bản quyền).
- Tinh chỉnh trọng số uy tín nguồn nâng cao (authority).
- **Google News Scraper (Apify) như "lớp khám phá"** — KHÔNG thay RSS; chỉ thêm ở
  Phase 2 để phủ rộng tin ngoài danh sách RSS + tăng độ tin "N nguồn". Lý do hoãn
  & cách dùng: xem §12.6.

---

## 3. Tech stack

| Lớp | Công nghệ | Lý do |
|---|---|---|
| Frontend + API | **Next.js (App Router, TypeScript)** | Một ngôn ngữ cho cả web lẫn backend, dễ học, deploy Vercel một chạm |
| Database | **Supabase (Postgres + `pgvector`)** | Lưu post/cụm + vector embedding; có sẵn Auth + Realtime + bình luận |
| Auth & bình luận | **Supabase Auth + bảng comments** | Không phải tự dựng đăng nhập |
| Cập nhật realtime | **Supabase Realtime** | Banner "tin mới" không cần tự viết websocket |
| Lịch chạy pipeline | **Vercel Cron** (hoặc Supabase scheduled functions) | Gọi các bước pipeline định kỳ |
| Tóm tắt + dịch | **Claude API (Haiku 4.5)** | Rẻ, nhanh, đủ chất cho tóm tắt/dịch tiếng Việt |
| Embedding | **Model local (Transformers.js, `Xenova/multilingual-e5-small`, 384 chiều)** | Chạy ngay trên máy/server, **miễn phí, không cần API key**; đủ tốt cho gom cụm |
| X & TikTok | **Apify** (actor pay-per-result) | Hai nền đóng; Apify ổn định + rẻ hơn API chính thức nhiều, có since_id/maxItems để tiết kiệm (§13) |

> Cần 2 API key: Claude (tóm tắt/dịch) và **Apify** (X + TikTok). **Embedding chạy
> local nên KHÔNG cần key.** Nguồn free dùng credential riêng: YouTube Data API
> key, Reddit API (client id/secret). Báo chí qua RSS không cần key.

---

## 4. Cơ chế gom cụm (Event Clustering) — CHỈ áp dụng cho báo chí

Gom cụm **chỉ chạy cho nguồn báo chí**. YouTube, Reddit, X, TikTok **luôn đứng
riêng** — mỗi item là một card độc lập, không gộp vào cụm báo chí và không gộp lẫn nhau.
Do đó embedding + cổng thực thể chỉ chạy cho báo chí.

Vì nguồn toàn **tin nước ngoài (chủ yếu tiếng Anh)**, gom cụm chạy **ở ngôn ngữ
gốc** — không cần gộp xuyên ngôn ngữ Việt↔Anh. Tiếng Việt chỉ xuất hiện ở đầu ra.

### Luồng (online clustering, chạy mỗi lần ingest)
```
Post mới → chuẩn hóa → embedding (EN) → lọc thô theo thực thể
        → cosine với centroid các cụm đang mở (48h)
        → max_sim > 0.82 và trùng thực thể ? nhập cụm : tạo cụm mới
        → cập nhật đại diện + đếm n_sources
```

1. **Chuẩn hóa** mọi nguồn về 1 schema `post` chung (xem §6).
2. **Embedding** title + đoạn mở đầu bằng model local `multilingual-e5-small` (384 chiều).
3. **Lọc thô (blocking):** chỉ so post mới với các cụm có **chung ≥1 thực thể
   chính** (tên riêng trích từ title) → giảm số phép so, nhanh/rẻ.
4. **So khớp:** cosine với centroid cụm. `max_sim > T_join (≈0.82)` **và** có
   thực thể trùng → nhập cụm; ngược lại tạo cụm mới.
5. **Cổng thực thể (entity gate):** bắt buộc trùng thực thể → tránh gộp nhầm hai
   tin "đều về AI" nhưng khác sự kiện.
6. **Cửa sổ 48h:** cụm cũ hơn thì đóng (status = archived).
7. **Đại diện + đếm nguồn:** chọn post từ nguồn uy tín nhất làm "mặt" cụm; đếm
   `n_sources` → ra "12 nguồn đưa tin".

**Trích thực thể (v1, đơn giản):** lấy cụm danh từ riêng / token viết hoa +
từ khóa sản phẩm từ title bằng heuristic. Đủ cho entity gate; không cần NER nặng.

**YouTube / Reddit / X / TikTok:** không qua bước gom cụm — luôn là card độc lập (xem §5).

---

## 5. Cơ chế xếp độ nóng (Heat Ranking) — v1 đơn giản

Hai cách tính tách theo loại nguồn, rồi quy về **thang 0–100** để trộn chung feed.

### Báo chí — độ mới là chính, độ phủ là điểm cộng
```
heat_press = n_sources / (age_hours + 2) ^ 1.5
```
- **Ưu tiên độ mới**: phạt thời gian mạnh (mũ 1.5) → feed luôn tươi, tin cũ trôi
  xuống dù nhiều nguồn (tránh cụm cũ "đóng đinh" top).
- Số nguồn tuyến tính = điểm cộng độ phủ vừa phải (cụm nhiều nguồn *mới* vẫn lên cao).
- Tham số `BREADTH_POWER`/`TIME_GRAVITY` trong `lib/score/heat.ts`, dễ tinh chỉnh.

### YouTube & Reddit — engagement tuyệt đối (v1), luôn đứng riêng
```
heat_engage = log10(1 + metric) / (age_hours + 2) ^ 1.5
```
- `metric` = views (YouTube) hoặc upvote (Reddit).
- `log10` để nén khoảng cách giữa các con số rất lớn.
- **v1 chấp nhận thiên vị kênh lớn.** Cơ chế "đột biến tương đối" (so với baseline
  của chính kênh) để **v2** — cần snapshot time-series.
- **Mỗi video/post là 1 card độc lập** (không gộp cụm).

### X — chỉ độ mới (v1), luôn đứng riêng
```
heat_x = 1 / (age_hours + 2) ^ 1.5
```
- Xếp **thuần theo độ mới** (quyết định thiết kế: tweet từ tài khoản đã curate,
  cứ mới là đủ tín hiệu — không cần engagement).
- **Mỗi tweet là 1 card độc lập**, không gộp vào cụm báo chí.
- Việc "tweet nào đáng hiện" xử lý ở khâu **ingest**: chỉ nạp từ danh sách tài
  khoản công nghệ uy tín đã curate (§12.4), không nạp toàn X.

### TikTok — engagement tuyệt đối (v1), luôn đứng riêng
```
heat_tiktok = log10(1 + views) / (age_hours + 2) ^ 1.5
```
- Cùng công thức YouTube/Reddit; `metric` = views (dùng likes nếu thiếu views).
- **Mỗi video là 1 card độc lập**, hiển thị chung luồng "Video" với YouTube.

### Trộn về một feed
- Chuẩn hóa mỗi loại về **0–100** (chia cho điểm cao nhất hiện thời của loại đó).
- Sort toàn cục giảm dần.
- **Luật đa dạng nhẹ:** không để quá N card cùng loại / cùng chủ đề liên tiếp ở
  đầu feed → người đọc thấy bức tranh tổng (AI + điện thoại + GPU + game…).

### "📈 Đang lên nhanh" (v1, đơn giản)
Xếp theo **số nguồn mới thêm vào cụm trong 1 giờ qua** (với báo chí) và item mới
có engagement cao bất thường (với YT/Reddit, thô). Bản gia tốc đầy đủ → v2.

---

## 6. Mô hình dữ liệu (Postgres / Supabase)

```
sources        (id, type[press|youtube|reddit|x|tiktok], name,
                config jsonb {feed_url|channel_id|subreddit|x_handle|tiktok_query},
                authority_weight, created_at)

posts          (id, source_id, source_type, external_id, title, text, url, author,
                published_at, lang, metrics jsonb, entities text[],
                embedding vector(384), cluster_id, fetched_at)
                -- metrics: { views, upvotes, comments, likes, reposts }
                -- embedding/entities/cluster_id: CHỈ dùng cho source_type=press

clusters       (id, representative_post_id, topic, n_sources int,
                source_types text[], first_seen, last_updated,
                heat_score float, status[open|archived])

cluster_summaries (cluster_id, summary_vi text, bullets_vi jsonb,
                   generated_at, input_hash)   -- cache tóm tắt AI

comments       (id, cluster_id, user_id, body, created_at)

users          -- Supabase Auth lo
```

(v2 thêm: `metric_snapshots(post_id, captured_at, views, upvotes)` cho gia tốc;
`follows(user_id, source_id)` cho cá nhân hóa.)

---

## 7. Pipeline xử lý (các job chạy nền)

Mỗi bước là một đơn vị độc lập, giao tiếp qua bảng Postgres:

1. **Ingest** (báo/YT/Reddit ~10–15 phút; **X & TikTok thưa hơn để tiết kiệm** — §13):
   - 5 adapter độc lập (RSS báo chí / YouTube API / Reddit API / X qua Apify /
     TikTok qua Apify) → chuẩn hóa về `post` → ghi DB. X & TikTok chỉ nạp từ
     tài khoản/hashtag đã curate, dùng since_id + maxItems để giảm chi phí (§13).
   - Adapter cắm-rút: nguồn nào lỗi thì bỏ qua, không vỡ feed.
2. **Enrich**: với post chưa có embedding → trích thực thể + gọi embedding → lưu.
3. **Cluster** (CHỈ báo chí): chạy online clustering cho post báo chí mới → gán
   `cluster_id`, cập nhật `n_sources`, đại diện. YouTube/Reddit/X/TikTok bỏ qua bước này.
4. **Score**: tính lại `heat_score` cho các cụm đang mở.
5. **Summarize** (tiết kiệm chi phí — **chỉ cụm lên feed**):
   - Cụm vượt ngưỡng heat / lọt top → gọi Claude đọc cả cụm → xuất tóm tắt tiếng
     Việt (2–3 câu) + bullet → lưu `cluster_summaries`.
   - Chỉ chạy lại khi cụm đổi đáng kể (input_hash thay đổi, vd thêm nhiều nguồn).
6. **Serve**: Next.js API đọc cụm + tóm tắt + điểm nóng → trả feed cho UI.

> Nguyên tắc tiết kiệm: **không dịch/tóm tắt từng post**. Chỉ cụm thật sự lên feed
> mới tốn 1 lượt gọi AI.

---

## 8. Giao diện (theo mockup)

- **Layout 3 cột, dark theme.**
  - Trái: điều hướng (Trang chủ / Đang nóng / Mới nhất / Video) + lọc nguồn
    (Tất cả / Báo chí / YouTube / Reddit / X / TikTok) + (v2: Theo dõi).
  - Giữa: **feed trộn các loại card** — cụm tin nóng, card báo chí (gộp đa nguồn),
    card YouTube (thumbnail + thời lượng), card Reddit (subreddit + upvote),
    card X (nội dung tweet + tác giả), card TikTok (thumbnail video dọc).
  - Phải: "🔥 Đang nóng" + "📈 Đang lên nhanh".
- Chip lọc chủ đề (AI, Điện thoại, Laptop, Apple, Android, Game).
- Banner "↑ N tin mới" (Supabase Realtime).
- Mỗi card: tóm tắt AI + bullet + số nguồn + số bình luận + "Mở cụm tin".
- Trang chi tiết **cụm báo chí**: tóm tắt + danh sách tất cả nguồn trong cụm
  (link gốc) + khung bình luận của site.
- Trang chi tiết **card X**: hiển thị nội dung tweet + **các reply lấy qua Apify**
  (actor hỗ trợ conversation/replies, có cache) + khung bình luận của site. Nếu
  Apify lỗi → vẫn hiện tweet, ẩn phần reply (degrade gracefully).
- Trang chi tiết **card TikTok**: nhúng video TikTok + (tùy chọn) top comment lấy
  qua Apify + khung bình luận của site.
- Trang chi tiết **YouTube/Reddit**: nhúng video / link bài gốc + khung bình luận.

### Bản quyền (quan trọng)
- Báo chí: hiển thị **tóm tắt + trích đoạn ngắn + link về nguồn gốc** (như Google
  News). **Không** đăng lại toàn văn.
- "Dịch nguyên bài gốc" hoãn v2 và chỉ áp dụng cho nguồn có giấy phép/cho phép.

---

## 9. Các đơn vị (module) và ranh giới

| Module | Việc | Phụ thuộc |
|---|---|---|
| `adapters/*` | Lấy + chuẩn hóa từ 1 nguồn về `post` | API nguồn |
| `enrich` | Trích thực thể + embedding | OpenAI |
| `cluster` | Gom post thành cụm | embedding, DB |
| `score` | Tính heat | DB |
| `summarize` | Tóm tắt/dịch cụm sang tiếng Việt | Claude |
| `web` (Next.js) | Feed UI + bình luận + auth | Supabase |

Mỗi module test được độc lập: cho `post` mẫu → kiểm tra cụm/điểm/tóm tắt đầu ra.

---

## 10. Rủi ro & ràng buộc

- **Bản quyền** (§8) — đã xử lý bằng cách chỉ tóm tắt + link.
- **Chi phí AI** — kiểm soát bằng "chỉ tóm tắt cụm lên feed" + cache.
- **Quota API nguồn** (YouTube/Reddit) — ingest theo nhịp, cache, tôn trọng limit.
- **Phụ thuộc Apify (X + TikTok)** — tính tiền theo số kết quả; actor có thể đổi
  giá/hỏng. Phòng: adapter swappable, chọn actor pay-per-result rẻ + bảo trì tốt,
  bật since_id/maxItems (§13), và để các nguồn free-API ngoài Apify → Apify sập thì
  phần lớn feed vẫn sống.
- **Chất lượng gom cụm** — phụ thuộc ngưỡng `T_join`; cần tinh chỉnh bằng dữ liệu
  thật. Có thể dùng LLM xác nhận ở vùng biên (0.75–0.82) nếu cần — để sau.

---

## 11. Lộ trình triển khai (đề xuất build dần)

1. **Xương sống dữ liệu**: schema Supabase + 1 adapter báo chí RSS → đổ post vào DB.
2. **Gom cụm + điểm nóng** (báo chí trước) → API feed tối giản.
3. **Feed UI** theo mockup (đọc data thật).
4. **Tóm tắt AI tiếng Việt** ở cấp cụm.
5. **Thêm adapter YouTube + Reddit + X (Apify) + TikTok (Apify)** (đã cắm-rút sẵn).
6. **Auth + bình luận + realtime "tin mới"** + trang chi tiết (reply X qua Apify).

(v2: snapshot + gia tốc "đột biến" cho YT/Reddit, cá nhân hóa, dịch full có giấy phép.)

---

## 12. Danh mục nguồn ban đầu (seed config)

> Đây là cấu hình hạt giống để nạp vào bảng `sources`. Phần đánh dấu **(thêm)** là
> do tôi bổ sung — bạn tự do chỉnh/bỏ. **Lưu ý:** handle X và tên subreddit nên
> kiểm tra lại trước khi chạy (có thể đổi/đã ngừng).

### 12.1 Báo chí (RSS)

| Nguồn | URL |
|---|---|
| NotebookCheck | https://www.notebookcheck.net/ |
| 9to5Google | https://9to5google.com/ |
| 9to5Mac | https://9to5mac.com/ |
| Engadget | https://www.engadget.com/ |
| MacRumors | https://www.macrumors.com/ |
| Android Authority | https://www.androidauthority.com/ |
| GSMArena | https://www.gsmarena.com/ |
| The Verge | https://www.theverge.com/ |
| CNET | https://www.cnet.com/ |
| BGR | https://www.bgr.com/ |
| Macworld | https://www.macworld.com/ |
| TechCrunch | https://techcrunch.com/ |
| WCCFTech | https://wccftech.com/ |
| Gizmochina | https://www.gizmochina.com/ |
| Windows Central | https://www.windowscentral.com/ |
| Tom's Hardware | https://www.tomshardware.com/ |
| Ars Technica **(thêm)** | https://arstechnica.com/ |
| AndroidPolice **(thêm)** | https://www.androidpolice.com/ |
| Wired **(thêm)** | https://www.wired.com/ |
| The Information **(thêm)** | https://www.theinformation.com/ |

> Mỗi trang trên đều có RSS (thường ở `/feed/` hoặc `/rss`). Adapter sẽ lấy feed
> tương ứng từng trang.

### 12.2 Kênh YouTube

| Kênh | Link |
|---|---|
| HardwareCanucks | https://www.youtube.com/@HardwareCanucks/videos |
| Dave2D | https://www.youtube.com/@Dave2D |
| MKBHD | https://www.youtube.com/@mkbhd |
| The Tech Chap | https://www.youtube.com/@Thetechchap/videos |
| Max Tech | https://www.youtube.com/@MaxTechOfficial/videos |
| Mrwhosetheboss | https://www.youtube.com/@Mrwhosetheboss/videos |
| Linus Tech Tips **(thêm)** | https://www.youtube.com/@LinusTechTips |
| The Verge **(thêm)** | https://www.youtube.com/@TheVerge |
| Mrwhosetheboss / UrAvgConsumer **(thêm)** | https://www.youtube.com/@UrAvgConsumer |
| Marques / JerryRigEverything **(thêm)** | https://www.youtube.com/@JerryRigEverything |
| Engadget **(thêm)** | https://www.youtube.com/@engadget |

> YouTube Data API có endpoint lấy uploads mới nhất theo `channelId` + thống kê
> views — adapter dùng cái này.

### 12.3 Reddit (subreddit)

**Bạn cung cấp:** r/technology, r/gadgets, r/Android, r/apple, r/hardware,
r/buildapc, r/intel, r/AMD, r/nvidia, r/LocalLLaMA, r/artificial, r/laptops,
r/Monitors

**(thêm):** r/pcgaming, r/gaming, r/mac, r/iphone, r/GooglePixel, r/samsung,
r/MachineLearning, r/OpenAI, r/singularity, r/programming, r/homelab,
r/selfhosted, r/linux, r/headphones, r/wearables, r/Futurology,
r/electricvehicles, r/teslamotors, r/cybersecurity, r/pcmasterrace

> Adapter đọc bài "hot"/"new" của mỗi sub qua Reddit API (`/r/{sub}/hot.json`).

### 12.4 X / Twitter (qua Apify)

**Bạn cung cấp:** @MKBHD, @verge, @TechCrunch, @engadget, @arstechnica, @CNET,
@MacRumors, @9to5mac, @9to5Google, @GSMArena, @androidauth · leaker: @evleaks,
@UniverseIce, @Tom_Warren, @markgurman, @rolandquandt

**(thêm) — CEO / Lãnh đạo:** @sundarpichai (Google), @tim_cook (Apple),
@satyanadella (Microsoft), @sama (OpenAI), @elonmusk (Tesla/X), @LisaSu (AMD),
@gdb (OpenAI), @demishassabis (DeepMind), @ylecun (Meta AI)

**(thêm) — Hãng / Tổ chức:** @Google, @nvidia, @AMD, @intel, @OpenAI,
@AnthropicAI, @GoogleDeepMind, @AIatMeta, @Qualcomm, @SamsungMobile, @Microsoft,
@Windows

**(thêm) — Báo / Trang tin:** @Tomshardware, @WindowsCentral, @BGR, @wccftech,
@AndroidPolice, @Wired, @theinformation, @mashable

**(thêm) — Reviewer / Nhà báo:** @Dave2D, @UrAvgConsumer, @MrMobile, @LinusTech,
@stratechery, @VadimYuryev

**(thêm) — Leaker:** @OnLeaks, @kopite7kimi, @dylan522p, @momomo_us, @SnoopyTech,
@chunvn8888, @digitalchatstn, @PandaFlashPro, @Jukanlosreve, @theapplehub

**(thêm) — AI:** @karpathy, @AndrewYNg, @DrJimFan, @emollick

> Adapter X gọi **Apify actor** (pay-per-result rẻ, vd `apidojo/twitter-scraper-lite`
> hoặc `kaitoeasyapi`) với input = các handle trên + `since_id` + `maxItems` (§13).
> Reply ở trang chi tiết lấy qua actor hỗ trợ conversation.

### 12.5 TikTok (qua Apify)

Lấy theo **hashtag** (khám phá rộng) + một ít **creator** chốt chất lượng. Hashtag
thường hiệu quả hơn account cho TikTok.

**Hashtag gợi ý:** #technews, #techtok, #gadgets, #ai, #smartphone, #apple,
#android, #pcbuild, #unboxing

**Creator gợi ý (kiểm tra lại handle):** @mkbhd, @mrwhosetheboss, @carterpcs,
@thetechbrothers, @techburner

> Adapter TikTok gọi Apify TikTok scraper (vd `clockworks/tiktok-scraper`) với
> input = hashtag/creator + `maxItems` thấp + lọc theo ngày để chỉ lấy video mới.

### 12.6 Google News Scraper (Apify) — HOÃN, chỉ là "lớp khám phá" Phase 2

**Quyết định: KHÔNG dùng cho v1.** Báo chí v1 đi qua **RSS curate (free, sạch, text
dày)** — xem §12.1. Google News Scraper chỉ cân nhắc ở Phase 2 với vai trò *phủ rộng*.

**Vì sao không thay RSS:**
- Press đang là trụ **free + chất lượng + hợp lệ + text dày nhất**; đẩy qua Apify =
  tốn tiền + snippet mỏng → **tóm tắt AI kém đi** (mất giá trị cốt lõi).
- Grouping của GN chỉ rút từ mô tả RSS, *mỏng & thất thường* → **không thay được
  cơ chế gom cụm §4**, nên vẫn phải tự cluster.
- Link Google News hay kẹt redirect; lẫn nhiều site rác SEO.

**Nếu thêm ở Phase 2 (mô hình hybrid):** dùng làm *lớp khám phá* — query vài topic
tech ("AI", "iPhone", "GPU"…), **allowlist nguồn** để lọc rác, dedupe theo URL gốc,
đổ vào cùng pipeline §4 như nguồn báo bổ sung + tăng độ tin con số "N nguồn". Tối ưu
chi phí theo §13 (ít topic, `maxItems` thấp, lọc theo ngày).

---

## 13. Quy tắc tiết kiệm chi phí Apify (X + TikTok)

Apify tính **tiền theo số kết quả trả về**. Kẻ thù lớn nhất là feed "cập nhật liên
tục" fetch lại cùng một post nhiều lần. Mọi tối ưu xoay quanh: *lấy ít kết quả, ít
lần hơn*. Áp dụng khi code adapter X/TikTok (Phase 5):

1. **Incremental (`since_id` / lọc theo ngày):** lưu id mới nhất đã thấy của mỗi
   handle/hashtag; lần sau chỉ kéo cái mới hơn. Đòn tiết kiệm lớn nhất.
2. **Chặn trần `maxItems` thấp** (vd 5–10 item mới nhất / handle). Chỉ cần cái mới.
3. **Phân tầng nhịp poll (hot/cold):** account/hashtag tín hiệu cao poll dày
   (30–60'); phần đuôi dài poll 2–3 giờ/lần. KHÔNG poll mọi thứ mỗi 10'.
4. **Dùng actor pay-per-result rẻ nhất** (~$0.15/1k tweet; giá đã gồm proxy).
   Tránh actor tính theo compute-unit.
5. **Burst theo sự kiện:** baseline thấp; chỉ tăng nhịp khi đang có cụm nóng
   (ngày launch). Ngày thường để nguội.
6. **Tận dụng $5 credit free/tháng** cho giai đoạn demo.

**Ước tính chi phí (đã tối ưu):** X ~$5–25/tháng tùy nhịp; TikTok tương tự nếu giới
hạn hashtag + maxItems. Báo/YouTube/Reddit = $0 (kênh free). Tổng Apify thường
**< $40/tháng** ở quy mô demo/đầu. **Chi phí ingest phụ thuộc số nguồn × nhịp poll,
KHÔNG phụ thuộc số người dùng** → dễ dự toán.
