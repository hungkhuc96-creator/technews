import { describe, it, expect } from 'vitest';
import { buildPrompt, parseSummary, summarizeCluster, type ArticleInput } from './summarizeCluster';

const articles: ArticleInput[] = [
  { title: 'OpenAI launches GPT-5.2', text: 'New model tops benchmarks.', sourceName: 'The Verge' },
  { title: 'GPT-5.2 is here', text: 'Cheaper and faster.', sourceName: 'TechCrunch' },
];

describe('buildPrompt', () => {
  it('chứa tiêu đề các bài và yêu cầu tiếng Việt + JSON', () => {
    const p = buildPrompt(articles);
    expect(p).toContain('OpenAI launches GPT-5.2');
    expect(p).toContain('TIẾNG VIỆT');
    expect(p).toContain('summary');
    expect(p).toContain('bullets');
  });
});

describe('parseSummary', () => {
  it('parse JSON thường', () => {
    const r = parseSummary('{"summary":"Tóm tắt.","bullets":["A","B"]}');
    expect(r.summary).toBe('Tóm tắt.');
    expect(r.bullets).toEqual(['A', 'B']);
  });
  it('parse JSON bọc trong ```json fence', () => {
    const r = parseSummary('```json\n{"summary":"X","bullets":["Y"]}\n```');
    expect(r.summary).toBe('X');
    expect(r.bullets).toEqual(['Y']);
  });
  it('ném lỗi nếu thiếu summary', () => {
    expect(() => parseSummary('{"bullets":[]}')).toThrow();
  });
});

describe('summarizeCluster', () => {
  it('gọi chat với prompt, trả kết quả đã parse', async () => {
    let seen = '';
    const fakeChat = async (prompt: string) => {
      seen = prompt;
      return '{"summary":"GPT-5.2 ra mắt.","bullets":["Dẫn đầu benchmark","Rẻ hơn"]}';
    };
    const r = await summarizeCluster(articles, fakeChat);
    expect(seen).toContain('GPT-5.2');
    expect(r.summary).toBe('GPT-5.2 ra mắt.');
    expect(r.bullets).toHaveLength(2);
  });
});
