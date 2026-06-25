import { describe, it, expect } from 'vitest';
import { isDeal } from './isDeal';

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
