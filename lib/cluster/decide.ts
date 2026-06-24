import { cosineSimilarity } from './similarity';

export interface ClusterCandidate {
  id: string;
  centroid: number[];
  entities: string[];
}

export function bestCluster(
  embedding: number[],
  entities: string[],
  candidates: ClusterCandidate[],
  threshold = 0.82,
): { clusterId: string; score: number } | null {
  const entitySet = new Set(entities);
  let best: { clusterId: string; score: number } | null = null;
  for (const c of candidates) {
    const overlap = c.entities.some((e) => entitySet.has(e));
    if (!overlap) continue;
    const score = cosineSimilarity(embedding, c.centroid);
    if (score >= threshold && (!best || score > best.score)) {
      best = { clusterId: c.id, score };
    }
  }
  return best;
}
