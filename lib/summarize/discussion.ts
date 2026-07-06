import type { SupabaseClient } from '@supabase/supabase-js';
import Parser from 'rss-parser';
import type { ChatFn } from './summarizeCluster';
import { fetchFeed, type FetchImpl } from '../sources/fetchFeed';

// "Cộng đồng nói gì": tóm tắt THẢO LUẬN của bài HN/Reddit bằng AI.
// - HN: cây bình luận qua API Algolia (miễn phí, không key).
// - Reddit: RSS bình luận của chính bài đăng (entry đầu = bài, sau = bình luận).
// Lazy khi bấm vào bài + cache VĨNH VIỄN vào posts.discussion_summary_vi —
// y hệt cơ chế video_summary_vi của YouTube.

export interface DiscussionComment {
  author: string;
  text: string;
}

const MAX_COMMENTS = 12;   // đủ nắm các luồng ý kiến, không làm prompt phình
const MAX_COMMENT_LEN = 400;

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(s: string, max = MAX_COMMENT_LEN): string {
  return s.length <= max ? s : `${s.slice(0, max).trimEnd()}…`;
}

// HN: https://hn.algolia.com/api/v1/items/{id} → children = bình luận cấp 1.
export function parseHnDiscussion(json: string, max = MAX_COMMENTS): DiscussionComment[] {
  const parsed = JSON.parse(json) as {
    children?: Array<{ author?: string | null; text?: string | null }>;
  };
  return (parsed.children ?? [])
    .filter((c) => (c.text ?? '').trim())
    .slice(0, max)
    .map((c) => ({ author: c.author ?? 'ẩn danh', text: clamp(stripHtml(c.text!)) }));
}

const rssParser = new Parser();

// Reddit: {permalink}.rss → entry ĐẦU là chính bài đăng (body của self-post),
// các entry sau là bình luận.
export async function parseRedditCommentsRss(
  xml: string,
  max = MAX_COMMENTS,
): Promise<{ postBody: string | null; comments: DiscussionComment[] }> {
  const feed = await rssParser.parseString(xml);
  const [first, ...rest] = feed.items ?? [];
  const body = first?.content ? clamp(stripHtml(first.content), 800) : null;
  const comments = rest
    .filter((i) => (i.content ?? '').trim())
    .slice(0, max)
    .map((i) => ({
      author: ((i as { author?: string }).author ?? i.creator ?? 'ẩn danh').replace(/^\/u\//, ''),
      text: clamp(stripHtml(i.content!)),
    }));
  return { postBody: body, comments };
}

export function buildDiscussionPrompt(opts: {
  title: string;
  sourceLabel: string;      // "Hacker News" | "Reddit (r/apple)"
  postBody?: string | null;
  comments: DiscussionComment[];
}): string {
  const lines = [
    `Đây là thảo luận trên ${opts.sourceLabel} về bài: "${opts.title}".`,
  ];
  if (opts.postBody) lines.push(`Nội dung bài đăng: ${opts.postBody}`);
  lines.push('Các bình luận nổi bật:');
  opts.comments.forEach((c, i) => lines.push(`${i + 1}. ${c.author}: ${c.text}`));
  lines.push(
    '',
    'Viết bằng TIẾNG VIỆT:',
    '- Dòng đầu: 1 câu nêu bài này nói về gì.',
    '- Sau đó 3-5 gạch đầu dòng (bắt đầu bằng "- ") tóm các LUỒNG Ý KIẾN chính của cộng đồng (đồng tình, phản đối, kinh nghiệm thực tế...). GIỮ NGUYÊN thuật ngữ/tên riêng.',
    '- Nếu có ý kiến sắc sảo hoặc hài hước đáng trích, thêm 1 gạch: - 💬 "câu trích dịch sang tiếng Việt" — tên người bình luận.',
    'CHỈ trả về nội dung trên, không lời dẫn, không tiêu đề.',
  );
  return lines.join('\n');
}

export async function summarizeDiscussionById(
  client: SupabaseClient,
  chat: ChatFn,
  postId: string,
  fetchImpl?: FetchImpl,
): Promise<string | null> {
  const { data: post } = await client
    .from('posts')
    .select('id, url, title, external_id, source_type, discussion_summary_vi, sources(name)')
    .eq('id', postId)
    .maybeSingle();
  if (!post || (post.source_type !== 'hn' && post.source_type !== 'reddit')) return null;
  if (post.discussion_summary_vi) return post.discussion_summary_vi; // cache → trả ngay

  let comments: DiscussionComment[] = [];
  let postBody: string | null = null;
  let sourceLabel = 'Hacker News';

  if (post.source_type === 'hn') {
    const json = await fetchFeed(
      `https://hn.algolia.com/api/v1/items/${post.external_id}`,
      fetchImpl,
    );
    comments = parseHnDiscussion(json);
  } else {
    const srcName = Array.isArray(post.sources)
      ? (post.sources[0] as { name?: string } | undefined)?.name
      : (post.sources as { name?: string } | null)?.name;
    sourceLabel = `Reddit (${srcName ?? 'reddit'})`;
    const xml = await fetchFeed(`${post.url}.rss?limit=25`, fetchImpl, {
      'user-agent': 'peek.vn news reader (+https://peek.vn/lien-he)',
    });
    ({ postBody, comments } = await parseRedditCommentsRss(xml));
  }

  // Không lấy được bình luận (Reddit chặn IP, bài chưa ai bàn...) → KHÔNG cache,
  // lần mở sau thử lại.
  if (comments.length === 0 && !postBody) return null;

  const summary = (
    await chat(buildDiscussionPrompt({ title: post.title, sourceLabel, postBody, comments }))
  ).trim();
  if (!summary) return null;

  await client.from('posts').update({ discussion_summary_vi: summary }).eq('id', postId);
  return summary;
}
