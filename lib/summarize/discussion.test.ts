import { describe, it, expect } from 'vitest';
import {
  parseHnDiscussion,
  parseRedditCommentsRss,
  buildDiscussionPrompt,
} from './discussion';

describe('parseHnDiscussion', () => {
  const FIXTURE = JSON.stringify({
    children: [
      { author: 'alice', text: 'Great writeup.<p>I use this <i>daily</i> &amp; love it.' },
      { author: null, text: 'Link tham khảo: https:&#x2F;&#x2F;example.com' },
      { author: 'bob', text: '   ' }, // rỗng → loại
      { author: 'carol', text: 'x'.repeat(500) }, // dài → cắt
    ],
  });

  it('gỡ HTML, giải mã entity, loại bình luận rỗng, cắt bình luận dài', () => {
    const comments = parseHnDiscussion(FIXTURE);
    expect(comments).toHaveLength(3);
    expect(comments[0]).toEqual({ author: 'alice', text: 'Great writeup. I use this daily & love it.' });
    expect(comments[1].author).toBe('ẩn danh');
    expect(comments[1].text).toContain('https://example.com');
    expect(comments[2].text.length).toBeLessThanOrEqual(401); // 400 + dấu …
    expect(comments[2].text.endsWith('…')).toBe(true);
  });

  it('trần số bình luận chỉnh được', () => {
    expect(parseHnDiscussion(FIXTURE, 1)).toHaveLength(1);
  });
});

describe('parseRedditCommentsRss', () => {
  const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <author><name>/u/poster</name></author>
    <id>t3_post1</id>
    <title>My weird ChatGPT experience</title>
    <content type="html">&lt;p&gt;So this happened today with my chatbot...&lt;/p&gt;</content>
  </entry>
  <entry>
    <author><name>/u/skeptic</name></author>
    <id>t1_c1</id>
    <content type="html">&lt;p&gt;This is just a hallucination, nothing new.&lt;/p&gt;</content>
  </entry>
  <entry>
    <author><name>/u/fan</name></author>
    <id>t1_c2</id>
    <content type="html">&lt;p&gt;Happened to me too!&lt;/p&gt;</content>
  </entry>
</feed>`;

  it('entry đầu = thân bài đăng, các entry sau = bình luận, bỏ tiền tố /u/', async () => {
    const { postBody, comments } = await parseRedditCommentsRss(ATOM);
    expect(postBody).toBe('So this happened today with my chatbot...');
    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({ author: 'skeptic', text: 'This is just a hallucination, nothing new.' });
  });
});

describe('buildDiscussionPrompt', () => {
  it('có tiêu đề, nguồn, thân bài, bình luận đánh số và yêu cầu tiếng Việt', () => {
    const p = buildDiscussionPrompt({
      title: 'Tiêu đề bài',
      sourceLabel: 'Reddit (r/apple)',
      postBody: 'Thân bài',
      comments: [{ author: 'alice', text: 'ý kiến 1' }],
    });
    expect(p).toContain('Reddit (r/apple)');
    expect(p).toContain('"Tiêu đề bài"');
    expect(p).toContain('Nội dung bài đăng: Thân bài');
    expect(p).toContain('1. alice: ý kiến 1');
    expect(p).toContain('TIẾNG VIỆT');
  });

  it('không có thân bài → không chèn dòng rỗng', () => {
    const p = buildDiscussionPrompt({
      title: 'T', sourceLabel: 'Hacker News', comments: [{ author: 'a', text: 'b' }],
    });
    expect(p).not.toContain('Nội dung bài đăng');
  });
});
