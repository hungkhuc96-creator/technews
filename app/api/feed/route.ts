import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const limit = Math.min(Math.max(Number(sp.get('limit')) || 20, 1), 50);
  const offset = Math.max(Number(sp.get('offset')) || 0, 0);
  const client = createServiceClient();
  const items = await getFeed(client, limit, offset);
  return NextResponse.json({ items });
}
