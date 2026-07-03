import { cosineSimilarity } from './similarity';

export interface ClusterCandidate {
  id: string;
  centroid: number[];
  entities: string[];
}

// Trả cụm giống nhất trên ngưỡng cosine + CỜ `overlap` (có trùng thực thể không).
// KHÔNG còn loại thẳng ứng viên vì thiếu thực thể — việc quyết định gộp hay không
// để cho lớp trên: trùng thực thể + rất giống → gộp thẳng; còn lại → hỏi AI.
// (Trước đây bắt buộc trùng thực thể nên bỏ sót nhiều cặp cùng sự kiện mà tiêu đề
// dùng từ khác nhau — nguyên nhân chính khiến đa số cụm chỉ có 1 nguồn.)
export function bestCluster(
  embedding: number[],
  entities: string[],
  candidates: ClusterCandidate[],
  threshold = 0.82,
): { clusterId: string; score: number; overlap: boolean } | null {
  const entitySet = new Set(entities);
  let best: { clusterId: string; score: number; overlap: boolean } | null = null;
  for (const c of candidates) {
    // Bỏ qua cụm khác số chiều (so vector lệch chiều là vô nghĩa).
    if (c.centroid.length !== embedding.length) continue;
    const score = cosineSimilarity(embedding, c.centroid);
    if (score < threshold) continue;
    if (!best || score > best.score) {
      const overlap = c.entities.some((e) => entitySet.has(e));
      best = { clusterId: c.id, score, overlap };
    }
  }
  return best;
}
