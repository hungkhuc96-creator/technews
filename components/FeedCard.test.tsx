// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FeedCard } from './FeedCard';
import type { FeedItem } from '../lib/feed/getFeed';

afterEach(cleanup);

const item: FeedItem = {
  clusterId: 'c1',
  title: 'OpenAI launches GPT-5.2',
  url: 'https://example.com/gpt',
  sourceName: 'The Verge',
  publishedAt: '2026-06-24T11:00:00.000Z',
  updatedAt: null,
  nSources: 7,
  sources: [],
  authorName: null,
  metrics: {},
  sourceTypes: ['press'],
  heat: 0.5,
  titleVi: 'OpenAI ra mắt GPT-5.2',
  imageUrl: 'https://example.com/gpt.jpg',
  summary: 'Tóm tắt tiếng Việt.',
  bullets: ['Ý chính một', 'Ý chính hai'],
};

describe('FeedCard', () => {
  it('hiển thị tiêu đề TIẾNG VIỆT, tên nguồn và nhãn số nguồn', () => {
    render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('OpenAI ra mắt GPT-5.2')).toBeDefined();
    expect(screen.getByText(/The Verge/)).toBeDefined();
    expect(screen.getByText(/7 nguồn đưa tin/)).toBeDefined();
    expect(screen.getByText(/1 giờ trước/)).toBeDefined();
  });

  it('hiển thị "cập nhật" theo bài MỚI NHẤT khi cụm có bài mới hơn bài đại diện', () => {
    render(
      <FeedCard
        item={{ ...item, publishedAt: '2026-06-20T12:00:00.000Z', updatedAt: '2026-06-24T11:00:00.000Z' }}
        now={new Date('2026-06-24T12:00:00.000Z')}
      />,
    );
    // dùng giờ của bài cập nhật (1 giờ trước), không phải bài đại diện (4 ngày trước)
    expect(screen.getByText(/cập nhật 1 giờ trước/)).toBeDefined();
  });

  it('thẻ báo hiển thị đoạn tóm tắt; nếu không có thì hiện bullet', () => {
    const { rerender } = render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('Tóm tắt tiếng Việt.')).toBeDefined();
    rerender(<FeedCard item={{ ...item, summary: null }} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('Ý chính một')).toBeDefined();
  });

  it('footer luôn có "Xem tin" + nhãn số nguồn (thẻ báo)', () => {
    const { container } = render(<FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(container.querySelector('.see')?.textContent).toContain('Xem tin');
    expect(screen.getByText(/7 nguồn đưa tin/)).toBeDefined();
  });

  it('thẻ X: hiện tweet, ẢNH bài gốc (không avatar) và lượt tương tác', () => {
    const x: FeedItem = {
      ...item, sourceTypes: ['x'], sourceName: '@MKBHD', authorName: 'Marques Brownlee',
      title: 'Tweet về M5', titleVi: null, summary: null, bullets: [],
      imageUrl: 'https://pbs.twimg.com/media/a.jpg', metrics: { likes: 3400, reposts: 120, comments: 45 },
    };
    const { container } = render(<FeedCard item={x} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('Tweet về M5')).toBeDefined();
    expect(screen.getByText(/Marques Brownlee/)).toBeDefined();
    expect(container.querySelector('img.x-media')).not.toBeNull(); // ảnh bài
    expect(container.querySelector('img.x-avatar')).toBeNull();     // không còn avatar
    expect(screen.getByText(/3,4k/)).toBeDefined();
  });

  it('thẻ YouTube: hiện lượt xem', () => {
    const yt: FeedItem = {
      ...item, sourceTypes: ['youtube'], sourceName: 'MKBHD', titleVi: 'Video M5',
      summary: null, bullets: [], metrics: { views: 1200000 },
    };
    render(<FeedCard item={yt} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText(/1,2M lượt xem/)).toBeDefined();
  });

  it('hiển thị thumbnail khi có ảnh', () => {
    const { container } = render(
      <FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} />,
    );
    const img = container.querySelector('img.card-thumb') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('example.com/gpt.jpg');
  });

  it('không có titleVi thì dùng tiêu đề gốc', () => {
    render(<FeedCard item={{ ...item, titleVi: null }} now={new Date('2026-06-24T12:00:00.000Z')} />);
    expect(screen.getByText('OpenAI launches GPT-5.2')).toBeDefined();
  });

  it('bấm vào thẻ gọi onOpen (mở panel đọc)', () => {
    let opened = 0;
    const { container } = render(
      <FeedCard item={item} now={new Date('2026-06-24T12:00:00.000Z')} onOpen={() => { opened += 1; }} />,
    );
    (container.querySelector('.card') as HTMLElement).click();
    expect(opened).toBe(1);
  });
});
