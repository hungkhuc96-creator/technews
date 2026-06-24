import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
  }
  return extractorPromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  // e5 khuyến nghị tiền tố "passage: " cho văn bản tài liệu.
  const output = await extractor(`passage: ${text}`, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}
