import type { MetadataRoute } from 'next';
import { createServiceClient } from '@/lib/db/client';
import { SITE_URL } from '@/lib/site';

// Sitemap cho Google: trang chủ + ~300 tin mới cập nhật nhất. Làm mới mỗi giờ.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = createServiceClient();
  const { data: clusters } = await client
    .from('clusters')
    .select('id, last_updated')
    .eq('status', 'open')
    .order('last_updated', { ascending: false })
    .limit(300);

  return [
    { url: SITE_URL, changeFrequency: 'hourly', priority: 1 },
    ...(clusters ?? []).map((c) => ({
      url: `${SITE_URL}/tin/${c.id}`,
      lastModified: new Date(c.last_updated),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}
