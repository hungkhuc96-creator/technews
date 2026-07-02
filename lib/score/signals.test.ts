import { describe, it, expect } from 'vitest';
import { isTier1, isUsOnly } from './signals';

describe('isTier1', () => {
  it('nhận nguồn uy tín (không phân biệt hoa thường)', () => {
    expect(isTier1('The Verge')).toBe(true);
    expect(isTier1("Tom's Hardware")).toBe(true);
    expect(isTier1('NotebookCheck')).toBe(false);
    expect(isTier1('Gizmochina')).toBe(false);
  });
});

describe('isUsOnly', () => {
  it('bắt tin nhà mạng/dịch vụ thuần Mỹ', () => {
    expect(isUsOnly('T-Mobile Is Automatically Pushing Legacy Customers Onto Its Current Plans')).toBe(true);
    expect(isUsOnly('Verizon quietly raises fees again')).toBe(true);
    expect(isUsOnly('AT&T expands 5G coverage in rural America')).toBe(true);
    expect(isUsOnly('Comcast loses another 500k cable subscribers')).toBe(true);
  });

  it('KHÔNG bắt nhầm tin công nghệ chung', () => {
    expect(isUsOnly('Apple announces iPhone 18 Pro with new design')).toBe(false);
    expect(isUsOnly('Sony is killing all physical PlayStation game discs')).toBe(false);
    expect(isUsOnly('Samsung Galaxy Z Fold 8 leaks in full')).toBe(false);
    // "attention" chứa "att" — không được dính /\bAT&T\b/
    expect(isUsOnly('Attention to detail makes this the best laptop')).toBe(false);
  });
});
