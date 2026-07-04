import { describe, it, expect } from 'vitest';
import { isDeal, isNoise, isOffTopic } from './isDeal';

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

  it('chặn deal LỌT LƯỚI 4/7 (case thật): "Sales" ngày lễ + gói mua trọn đời', () => {
    expect(isNoise('The Best Fourth of July Mattress Sales on Beds We Actually Sleep On (2026)')).toBe(true);
    expect(isNoise('The best July 4th sales we found so far')).toBe(true);
    expect(isNoise('Fourth of July Sales: Save on AirTag 2, M3 iPad Air, Charging Accessories')).toBe(true);
    expect(isNoise('Block ads & more on 9 devices for life — AdGuard’s Family Plan is a one-time purchase')).toBe(true);
    expect(isNoise('Altra Running Promo Codes July 2026')).toBe(true);
  });

  it('KHÔNG chặn "sales" nghĩa DOANH SỐ (tiêu đề thật trên feed 4/7)', () => {
    expect(isNoise('Tesla saw a massive sales jump in the second quarter')).toBe(false);
    expect(isNoise('Rivian raises EV sales forecast as Q2 production ramps up')).toBe(false);
    expect(isNoise('Nvidia offers to take a cut of AI cloud revenue on top of hardware sales')).toBe(false);
    expect(isNoise('Sony teases another PlayStation Plus price increase, as PS5 console sales slow')).toBe(false);
    expect(isNoise('Salesforce launches new AI agent')).toBe(false);
  });

  it('chặn theo NHÃN CHUYÊN MỤC RSS (case thật 4/7: Wired lẫn tin ngoài công nghệ)', () => {
    expect(isNoise('Food Preservatives May Increase the Risk of High Blood Pressure', ['Science / Health'])).toBe(true);
    expect(isNoise('Scientists Have Identified a New Fossil Species of Axolotl in Mexico', ['Science'])).toBe(true);
    expect(isNoise('The 14 Best Pizza Ovens We Tested', ['Gear / Buying Guides'])).toBe(true);
    // Nhãn công nghệ thật → giữ nguyên
    expect(isNoise('iPhone 18 rumors heat up', ['Gear / Products / Phones'])).toBe(false);
    expect(isNoise('OpenAI raises again', ['Business / Artificial Intelligence'])).toBe(false);
  });
});

describe('isOffTopic', () => {
  it('chặn chuyên mục ngoài công nghệ / dạng bài không phải tin', () => {
    expect(isOffTopic(['Science / Health'])).toBe(true);
    expect(isOffTopic(['Science / Environment'])).toBe(true);
    expect(isOffTopic(['Culture / Digital Culture'])).toBe(true);
    expect(isOffTopic(['Politics'])).toBe(true);
    expect(isOffTopic(['Gear / Deals'])).toBe(true);
    expect(isOffTopic(['Gear / Buying Guides'])).toBe(true);
    expect(isOffTopic(['Gear / How To and Advice'])).toBe(true);
  });

  it('giữ chuyên mục công nghệ; không nhãn = không chặn', () => {
    expect(isOffTopic(['Gear'])).toBe(false);
    expect(isOffTopic(['Gear / Gear News and Events'])).toBe(false);
    expect(isOffTopic(['Security'])).toBe(false);
    expect(isOffTopic(['Business'])).toBe(false);
    expect(isOffTopic([])).toBe(false);
  });
});
