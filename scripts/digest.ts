import { createServiceClient } from '../lib/db/client.js';
import { createChat } from '../lib/summarize/llmClient.js';
import { summarizeClusterById } from '../lib/summarize/summarizeById.js';
import { selectDigestItems, sentRecently, type DigestCandidate } from '../lib/digest/selectItems.js';
import { formatDigest, type DigestItem } from '../lib/digest/formatTelegram.js';
import { sendTelegramMessage } from '../lib/notify/telegram.js';

const HOST = process.env.SITE_URL ?? 'https://peek.vn';
const CANDIDATE_POOL = 25; // lấy dư để còn chọn sau khi loại tin đã gửi
const PICK = 5;
const SENT_WINDOW_DAYS = 7;

function todayVi(): string {
  // Ngày theo giờ VN (GitHub Actions chạy UTC) → dd/MM.
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit',
  }).format(new Date());
  return parts; // vd "03/07"
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) {
    throw new Error('Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHANNEL_ID');
  }

  const client = createServiceClient();

  // 0) Chốt chặn gửi đúp: có 2 đường kích (cron-job.org đúng giờ + GitHub dự
  // phòng 20' sau) — bản gần nhất gửi chưa đầy 90' thì lượt này bỏ qua.
  const { data: last } = await client
    .from('digest_log')
    .select('sent_at')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (sentRecently(last?.sent_at ?? null, new Date())) {
    console.log('Bản tin vừa gửi chưa đầy 90 phút — bỏ qua (tránh gửi đúp).');
    return;
  }

  // 1) Top cụm báo chí đang mở theo độ nóng (heat đã phạt tin cũ → top là tin gần).
  const { data: clusters, error: cErr } = await client
    .from('clusters')
    .select('id, heat_score')
    .eq('status', 'open')
    .order('heat_score', { ascending: false })
    .limit(CANDIDATE_POOL);
  if (cErr) throw new Error(`đọc clusters lỗi: ${cErr.message}`);
  const ids = (clusters ?? []).map((c) => c.id as string);
  if (ids.length === 0) {
    console.log('Không có cụm nào — bỏ qua bản tin.');
    return;
  }

  // 2) Tiêu đề + tóm tắt tiếng Việt của các cụm đó.
  const { data: sums } = await client
    .from('cluster_summaries')
    .select('cluster_id, title_vi, summary_vi')
    .in('cluster_id', ids);
  const byId = new Map((sums ?? []).map((s) => [s.cluster_id as string, s]));

  // 3) Cụm đã gửi trong 7 ngày → loại để không lặp.
  const since = new Date(Date.now() - SENT_WINDOW_DAYS * 86400_000).toISOString();
  const { data: sent } = await client
    .from('digest_log')
    .select('cluster_id')
    .gte('sent_at', since);
  const sentIds = new Set((sent ?? []).map((r) => r.cluster_id as string));

  // 4) Chọn top 5 chưa gửi (giữ thứ tự heat).
  const candidates: DigestCandidate[] = ids.map((id) => ({
    clusterId: id,
    titleVi: (byId.get(id)?.title_vi as string | null) ?? null,
    summary: (byId.get(id)?.summary_vi as string | null) ?? null,
  }));
  const picked = selectDigestItems(candidates, sentIds, PICK);
  if (picked.length === 0) {
    console.log('Không có tin mới nào chưa gửi — bỏ qua bản tin hôm nay.');
    return;
  }

  // 5) Cụm nào thiếu tóm tắt → sinh ngay (lazy, tối đa 5 lượt gọi/ngày).
  const chat = createChat();
  const items: DigestItem[] = [];
  for (const p of picked) {
    let summary = p.summary ?? '';
    if (!summary.trim()) {
      const s = await summarizeClusterById(client, chat, p.clusterId);
      summary = s?.summary ?? '';
    }
    items.push({ titleVi: p.titleVi!, summary, url: `${HOST}/tin/${p.clusterId}` });
  }

  // 6) Soạn + gửi. Chỉ ghi digest_log SAU khi gửi thành công.
  const html = formatDigest({ date: todayVi(), host: HOST, items });
  await sendTelegramMessage(token, chatId, html);
  const { error: logErr } = await client
    .from('digest_log')
    .upsert(picked.map((p) => ({ cluster_id: p.clusterId })), { onConflict: 'cluster_id' });
  if (logErr) throw new Error(`ghi digest_log lỗi: ${logErr.message}`);

  console.log(`Đã gửi bản tin ${items.length} tin.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
