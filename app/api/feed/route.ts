import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { fillMissingTitles } from '@/lib/feed/lazyTitles';
import { makeTitleTranslator } from '@/lib/summarize/batchTranslate';
import { createChat } from '@/lib/summarize/llmClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 20, 1), 50);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  const client = createServiceClient();
  let items = await getFeed(client, limit, offset);
  // Dịch lazy tiêu đề các tin nguội (ngoài top-80 mà cron dịch sẵn) khi cuộn tới.
  try {
    items = await fillMissingTitles(client, makeTitleTranslator(createChat()), items);
  } catch {
    /* dịch lỗi → trả tiêu đề gốc, không chặn feed */
  }
  return NextResponse.json({ items });
}
