import { describe, it, expect } from 'vitest';
import { makeSameEvent } from './sameEvent';

describe('makeSameEvent', () => {
  it('trả true khi AI nói "yes"', async () => {
    const sameEvent = makeSameEvent(async () => 'yes');
    expect(await sameEvent('Galaxy Watch 9 leak', 'Watch 9 design leaks')).toBe(true);
  });

  it('trả false khi AI nói "no"', async () => {
    const sameEvent = makeSameEvent(async () => 'no');
    expect(await sameEvent('Samsung announces Watch 9', 'Samsung Watch sales drop 28%')).toBe(false);
  });

  it('chịu được xuống dòng / hoa thường', async () => {
    const yes = makeSameEvent(async () => '  YES\n');
    const no = makeSameEvent(async () => 'No.');
    expect(await yes('a', 'b')).toBe(true);
    expect(await no('a', 'b')).toBe(false);
  });

  it('truyền đúng 2 tiêu đề vào prompt', async () => {
    let seen = '';
    const sameEvent = makeSameEvent(async (p) => { seen = p; return 'no'; });
    await sameEvent('TIÊU ĐỀ A', 'TIÊU ĐỀ B');
    expect(seen).toContain('TIÊU ĐỀ A');
    expect(seen).toContain('TIÊU ĐỀ B');
  });
});
