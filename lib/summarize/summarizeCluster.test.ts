import { describe, it, expect } from 'vitest';
import { buildPrompt, parseSummary, summarizeCluster, type ArticleInput } from './summarizeCluster';

const articles: ArticleInput[] = [
  { title: 'OpenAI launches GPT-5.2', text: 'New model tops benchmarks.', sourceName: 'The Verge' },
  { title: 'GPT-5.2 is here', text: 'Cheaper and faster.', sourceName: 'TechCrunch' },
];

describe('buildPrompt', () => {
  it('chứa tiêu đề bài, yêu cầu tiếng Việt + JSON gồm title/summary/bullets', () => {
    const p = buildPrompt(articles);
    expect(p).toContain('OpenAI launches GPT-5.2');
    expect(p).toContain('TIẾNG VIỆT');
    expect(p).toContain('title');
    expect(p).toContain('summary');
    expect(p).toContain('bullets');
  });
});

describe('parseSummary', () => {
  it('parse JSON gồm title', () => {
    const r = parseSummary('{"title":"Tiêu đề.","summary":"Tóm tắt.","bullets":["A","B"]}');
    expect(r.titleVi).toBe('Tiêu đề.');
    expect(r.summary).toBe('Tóm tắt.');
    expect(r.bullets).toEqual(['A', 'B']);
  });
  it('parse JSON bọc trong ```json fence', () => {
    const r = parseSummary('```json\n{"title":"X","summary":"Y","bullets":["Z"]}\n```');
    expect(r.titleVi).toBe('X');
    expect(r.summary).toBe('Y');
  });
  it('thiếu title → titleVi rỗng (không lỗi)', () => {
    const r = parseSummary('{"summary":"S","bullets":[]}');
    expect(r.titleVi).toBe('');
    expect(r.summary).toBe('S');
  });
  it('ném lỗi nếu thiếu summary', () => {
    expect(() => parseSummary('{"title":"x","bullets":[]}')).toThrow();
  });
});

describe('summarizeCluster', () => {
  it('gọi chat với prompt, trả kết quả đã parse (có titleVi)', async () => {
    let seen = '';
    const fakeChat = async (prompt: string) => {
      seen = prompt;
      return '{"title":"GPT-5.2 ra mắt","summary":"GPT-5.2 ra mắt.","bullets":["Dẫn đầu benchmark","Rẻ hơn"]}';
    };
    const r = await summarizeCluster(articles, fakeChat);
    expect(seen).toContain('GPT-5.2');
    expect(r.titleVi).toBe('GPT-5.2 ra mắt');
    expect(r.summary).toBe('GPT-5.2 ra mắt.');
    expect(r.bullets).toHaveLength(2);
  });
});
