import { describe, it, expect } from 'vitest';
import { versionSignature, versionConflict } from './versionConflict';

describe('versionSignature', () => {
  it('bắt số hiệu OS gắn với tên hệ điều hành', () => {
    expect(versionSignature('macOS 26.6 beta 5 now available')).toEqual({ macos: [26] });
    expect(versionSignature('The macOS 27 public beta is worth it')).toEqual({ macos: [27] });
    expect(versionSignature('Apple rolls out iPadOS 27 and macOS 27 Golden Gate')).toEqual({
      ipados: [27],
      macos: [27],
    });
  });

  it('bắt tên mã macOS và quy về số hiệu', () => {
    // Golden Gate = macOS 27, Tahoe = macOS 26
    expect(versionSignature('macOS Beta: What’s new in Golden Gate & should you install?')).toEqual({
      macos: [27],
    });
    // Có cả tên mã lẫn số → cùng major 26, gộp thành một
    expect(versionSignature('Fifth macOS Tahoe 26.6 Beta Now Available for Developers')).toEqual({
      macos: [26],
    });
  });

  it('bỏ số KHÔNG phải phiên bản OS (giá tiền, số điện thoại, chip)', () => {
    expect(versionSignature('This gadget costs $52,000 and is amazing')).toEqual({});
    expect(versionSignature('iPhone 17 Pro review')).toEqual({}); // không phải OS
  });
});

describe('versionConflict', () => {
  it('CHẶN khi cùng sản phẩm nhưng khác major (case thật 14/7)', () => {
    expect(
      versionConflict(
        'Fifth macOS Tahoe 26.6 Beta Now Available for Developers',
        'macOS 27 public beta now available, here’s how to install it',
      ),
    ).toBe(true);
    expect(
      versionConflict('macOS 26.6 beta 5 now available', 'macOS Beta: What’s new in Golden Gate'),
    ).toBe(true);
  });

  it('CHO GỘP khi cùng phiên bản (tên mã == số hiệu)', () => {
    // Tahoe = 26, khớp 26.6 → không mâu thuẫn
    expect(
      versionConflict('Fifth macOS Tahoe 26.6 Beta', 'macOS 26.6 beta 5 now available'),
    ).toBe(false);
    // cùng macOS 27
    expect(
      versionConflict('The macOS 27 public beta is worth it', 'macOS 27 public beta now available'),
    ).toBe(false);
  });

  it('CHO GỘP khi khác SẢN PHẨM dù trùng số (để entity/AI xử lý, không chặn nhầm)', () => {
    // macOS 27 vs iOS 27 — khác sản phẩm, không phải việc của chốt phiên bản
    expect(versionConflict('macOS 27 public beta', 'iOS 27 public beta now available')).toBe(false);
  });

  it('CHO GỘP khi một trong hai KHÔNG có số hiệu OS (không đủ căn cứ để chặn)', () => {
    expect(
      versionConflict('Apple announces new features for Mac users', 'macOS 27 public beta'),
    ).toBe(false);
    expect(versionConflict('iPhone 17 Pro review', 'iPhone 17 Pro Max review')).toBe(false);
  });
});
