import { createServiceClient } from '@/lib/db/client';
import { getFeed } from '@/lib/feed/getFeed';
import { FeedCard } from '@/components/FeedCard';
import { Sidebar } from '@/components/Sidebar';
import { Trending } from '@/components/Trending';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const items = await getFeed(createServiceClient(), 40);
  return (
    <>
      <header className="app-header">
        <span className="logo">nóng<span className="logo-dot" /></span>
        <span className="live"><span className="live-dot" /> LIVE</span>
      </header>
      <div className="layout">
        <Sidebar />
        <main className="feed">
          {items.length === 0 && (
            <p style={{ color: 'var(--text-faint)' }}>
              Chưa có tin. Chạy <code>npm run ingest:press</code> rồi{' '}
              <code>npm run process:press</code>.
            </p>
          )}
          {items.map((item) => (
            <FeedCard key={item.clusterId} item={item} />
          ))}
        </main>
        <Trending items={items} />
      </div>
    </>
  );
}
