// Ứng viên cho bản tin: 1 cụm tin đã kèm tiêu đề/tóm tắt tiếng Việt.
// (đã sắp sẵn theo heat_score giảm dần khi truyền vào)
export interface DigestCandidate {
  clusterId: string;
  titleVi: string | null;
  summary: string | null;
}

// Chọn top `limit` cụm CHƯA gửi gần đây. THUẦN: không đụng DB.
// - Bỏ cụm đã có trong `sentIds` (đã gửi 7 ngày qua) → không lặp tin.
// - Bỏ cụm thiếu tiêu đề tiếng Việt (chưa dịch xong → không đưa vào bản tin).
// - Giữ nguyên thứ tự đầu vào (heat cao trước).
// Chốt chặn GỬI ĐÚP: bản tin có 2 đường kích hoạt (cron-job.org đúng giờ +
// lịch GitHub dự phòng 20' sau) — nếu bản gần nhất mới gửi trong `windowMin`
// phút thì lượt sau phải bỏ qua. THUẦN: không đụng DB.
export function sentRecently(
  lastSentAt: string | null,
  now: Date,
  windowMin = 90,
): boolean {
  if (!lastSentAt) return false;
  return now.getTime() - new Date(lastSentAt).getTime() < windowMin * 60_000;
}

export function selectDigestItems(
  candidates: DigestCandidate[],
  sentIds: Set<string>,
  limit = 5,
): DigestCandidate[] {
  const out: DigestCandidate[] = [];
  for (const c of candidates) {
    if (out.length >= limit) break;
    if (sentIds.has(c.clusterId)) continue;
    if (!c.titleVi || !c.titleVi.trim()) continue;
    out.push(c);
  }
  return out;
}
