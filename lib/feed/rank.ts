export interface RankCandidate<T> {
  item: T;
  bucket: string;
  rawHeat: number;
}

// Chuẩn hóa rawHeat theo từng bucket (loại nguồn) về 0–1, rồi xếp chung giảm dần.
// → top mỗi loại đứng ngang nhau, không loại nào áp đảo vì thang đo khác nhau.
export function rankCandidates<T>(cands: RankCandidate<T>[], limit: number): T[] {
  const maxByBucket = new Map<string, number>();
  for (const c of cands) {
    maxByBucket.set(c.bucket, Math.max(maxByBucket.get(c.bucket) ?? 0, c.rawHeat));
  }
  return cands
    .map((c) => {
      const max = maxByBucket.get(c.bucket) ?? 0;
      return { item: c.item, score: max > 0 ? c.rawHeat / max : 0 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
