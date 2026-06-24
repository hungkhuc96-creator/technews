// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeedCard } from './FeedCard';
import type { FeedItem } from '../lib/feed/getFeed';

afterEach(cleanup);

const item: FeedItem = {
  clusterId: 'c1',
  title: 'OpenAI ra mắt GPT-5.2',
  url: 'https://example.com/gpt',
  sourceName: 'The Verge',
  publishedAt: '2026-06-24T11:00:00.000Z',
  nSources: 7,
  sourceTypes: ['press'],
  heat: 0.5,
};

describe('FeedCard', () => {
  it('hiển thị tiêu đề, tên nguồn và nhãn số nguồn', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('OpenAI ra mắt GPT-5.2')).toBeDefined();
    expect(screen.getByText(/The Verge/)).toBeDefined();
    expect(screen.getByText(/7 nguồn đưa tin/)).toBeDefined();
    expect(screen.getByText(/1 giờ trước/)).toBeDefined();
  });

  it('tiêu đề là link tới bài gốc, mở tab mới', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    const link = screen.getByRole('link', { name: /GPT-5.2/ }) as HTMLAnchorElement;
    expect(link.href).toContain('example.com/gpt');
    expect(link.target).toBe('_blank');
  });
});
