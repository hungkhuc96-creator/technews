export interface RankCandidate<T> {
  item: T;
  bucket: string;
  rawHeat: number;
}

// Chuẩn hóa rawHeat theo từng bucket (loại nguồn) về 0–1, xếp giảm dần. Nếu truyền
// maxConsecutive, áp luật đa dạng: không để quá maxConsecutive card cùng loại liên
// tiếp — khi chạm ngưỡng thì chen card loại khác có điểm cao nhất (kể cả điểm thấp).
export function rankCandidates<T>(
  cands: RankCandidate<T>[],
  limit: number,
  maxConsecutive = Infinity,
): T[] {
  const maxByBucket = new Map<string, number>();
  for (const c of cands) {
    maxByBucket.set(c.bucket, Math.max(maxByBucket.get(c.bucket) ?? 0, c.rawHeat));
  }
  const scored = cands
    .map((c) => {
      const max = maxByBucket.get(c.bucket) ?? 0;
      return { item: c.item, bucket: c.bucket, score: max > 0 ? c.rawHeat / max : 0 };
    })
    .sort((a, b) => b.score - a.score);

  if (!Number.isFinite(maxConsecutive)) {
    return scored.slice(0, limit).map((x) => x.item);
  }

  const pool = [...scored];
  const out: T[] = [];
  let lastBucket: string | null = null;
  let run = 0;
  while (out.length < limit && pool.length > 0) {
    let idx = 0;
    if (run >= maxConsecutive && lastBucket !== null) {
      const alt = pool.findIndex((x) => x.bucket !== lastBucket);
      if (alt >= 0) idx = alt;
    }
    const picked = pool.splice(idx, 1)[0];
    if (picked.bucket === lastBucket) run += 1;
    else {
      lastBucket = picked.bucket;
      run = 1;
    }
    out.push(picked.item);
  }
  return out;
}
