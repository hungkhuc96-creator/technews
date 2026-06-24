import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';

export const dynamic = 'force-dynamic';

export async function GET() {
  const client = createServiceClient();
  const items = await getFeed(client, 30);
  return NextResponse.json({ items });
}
