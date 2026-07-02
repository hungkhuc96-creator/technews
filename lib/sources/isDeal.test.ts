import { describe, it, expect } from 'vitest';
import { isDeal, isNoise } from './isDeal';

describe('isDeal', () => {
  it('nhận diện tin giảm giá / khuyến mãi', () => {
    expect(isDeal('19 of the best hand-picked Amazon Prime Day deals on laptops')).toBe(true);
    expect(isDeal('Deals: Rare Apple Watch Ultra 3 price drops nearly $100')).toBe(true);
    expect(isDeal('MOVA Prime Day sale: Save up to 40% off')).toBe(true);
    expect(isDeal('Get a half-price precision screwdriver set')).toBe(true);
    expect(isDeal('Best Black Friday discounts on monitors')).toBe(true);
    expect(isDeal('This robot vacuum is 30% off today')).toBe(true);
  });

  it('KHÔNG nhận nhầm tin thường', () => {
    expect(isDeal('iOS 27 beta 2 is out now')).toBe(false);
    expect(isDeal('Claude suffers outage, but Anthropic says fix is in')).toBe(false);
    expect(isDeal('MSI Claw 8 EX AI+ review: Big money for big performance')).toBe(false);
    expect(isDeal('Apple signs deal with chipmaker')).toBe(false); // "deal" số ít
    expect(isDeal('Salesforce launches new AI agent')).toBe(false); // "sale" trong Salesforce
  });
});

describe('isNoise', () => {
  it('chặn đố vui hằng ngày (tiêu đề THẬT từng lọt feed)', () => {
    expect(isNoise("Today's Wordle Hints, Answer and Help for June 24, #1831")).toBe(true);
    expect(isNoise("Today's NYT Connections Hints, Answers and Help for June 28, #1113")).toBe(true);
    expect(isNoise("Today's NYT Connections: Sports Edition Hints and Answers for June 27, #642")).toBe(true);
    expect(isNoise("Today's NYT Mini Crossword Answers for Wednesday, June 24")).toBe(true);
    expect(isNoise("Today's NYT Strands Hints, Answers and Help for June 29 #848")).toBe(true);
  });

  it('chặn deal từng LỌT LƯỚI (tiêu đề thật)', () => {
    expect(isNoise('Prime pick: Samsung Galaxy Watch 8 drops to a new low of $229.99')).toBe(true);
    expect(isNoise('The Samsung Galaxy Watch 8 LTE model is still at a record-low price on Amazon!')).toBe(true);
    expect(isNoise('Samsung flagship deal: The Galaxy S26 Plus just hit a fresh low at Amazon')).toBe(true);
  });

  it('KHÔNG chặn tin thật', () => {
    expect(isNoise('Samsung’s Galaxy Watch is off to a rough start for 2026 with a 28% drop in shipments')).toBe(false);
    expect(isNoise('Google Gemini can now answer questions about your screen')).toBe(false);
    expect(isNoise('Apple Vision Pro 2 hands-on: lighter and faster')).toBe(false);
    expect(isNoise('OpenAI announces GPT-6 with new reasoning modes')).toBe(false);
  });
});
