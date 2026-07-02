'use client';

import { logoFor, sourceAvatar } from '../lib/feed/sourceLogos';

const NAV: { icon: string; label: string; href?: string }[] = [
  { icon: '🏠', label: 'Trang chủ' },
  { icon: '🕐', label: 'Mới nhất' },
  { icon: '🎁', label: 'Deal người nhà', href: 'https://dealhungkhuc.com' },
];

const SOURCES: { key: string; icon: string; label: string }[] = [
  { key: 'press', icon: '📰', label: 'Báo chí' },
  { key: 'youtube', icon: '▶', label: 'YouTube' },
  { key: 'reddit', icon: '👽', label: 'Reddit' },
  { key: 'x', icon: '𝕏', label: 'X' },
  { key: 'tiktok', icon: '♪', label: 'TikTok' },
];

// "Theo dõi" = danh sách TUYỂN CHỌN để tạo niềm tin — CHỈ vài tên uy tín nhất,
// KHÔNG liệt kê đầy đủ nguồn crawl (tránh lộ toàn bộ danh mục nguồn của mình).
// Danh mục nguồn thật nằm ở lib/sources/*Seeds.ts.
const FOLLOWS = [
  { name: 'The Verge', initial: 'V', color: '#5b34da' },
  { name: 'TechCrunch', initial: 'T', color: '#1d8f3a' },
  { name: 'Ars Technica', initial: 'r', color: '#ff4e00' },
  { name: 'Engadget', initial: 'E', color: '#2d8c8c' },
  { name: 'MacRumors', initial: 'M', color: '#e0244b' },
  { name: "Tom's Hardware", initial: 'H', color: '#b5132b' },
];

// Kênh YouTube uy tín (avatar lấy qua unavatar theo handle).
const YT_FOLLOWS = [
  { name: 'MKBHD', handle: 'mkbhd', color: '#d23b3b' },
  { name: 'Linus Tech Tips', handle: 'LinusTechTips', color: '#e0531a' },
  { name: 'Dave2D', handle: 'Dave2D', color: '#2d8c8c' },
  { name: 'Mrwhosetheboss', handle: 'Mrwhosetheboss', color: '#5b34da' },
];

// Số nguồn còn lại KHÔNG nêu tên (tổng ~31 báo+kênh đang crawl, trừ 10 tên trên).
const MORE_SOURCES = 20;

export function Sidebar({
  counts, activeSource, onSelectSource, activeNav, onSelectNav,
}: {
  counts: Record<string, number>;
  activeSource: string;
  onSelectSource: (key: string) => void;
  activeNav: string;
  onSelectNav: (label: string) => void;
}) {
  return (
    <aside className="sidebar">
      <nav>
        {NAV.map((n) =>
          n.href ? (
            // "Deal người nhà" — mở trang ngoài (tab mới)
            <a
              key={n.label}
              className="nav-item"
              href={n.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{n.icon}</span>
              {n.label}
            </a>
          ) : (
            <div
              key={n.label}
              className={`nav-item${activeNav === n.label ? ' active' : ''}`}
              onClick={() => onSelectNav(n.label)}
            >
              <span>{n.icon}</span>
              {n.label}
            </div>
          ),
        )}
      </nav>

      <div className="side-title"><span>LỌC NGUỒN</span></div>
      <nav>
        <div
          className={`src-item${activeSource === 'all' ? ' active' : ''}`}
          onClick={() => onSelectSource('all')}
        >
          <span>◎</span>
          <span className="src-label">Tất cả nguồn</span>
        </div>
        {SOURCES.map((s) => (
          <div
            key={s.key}
            className={`src-item${activeSource === s.key ? ' active' : ''}`}
            onClick={() => onSelectSource(s.key)}
          >
            <span>{s.icon}</span>
            <span className="src-label">{s.label}</span>
            {counts[s.key] > 0 && <span className="src-badge">{counts[s.key]}</span>}
          </div>
        ))}
      </nav>

      <div className="side-title"><span>THEO DÕI</span><span>{FOLLOWS.length + YT_FOLLOWS.length + MORE_SOURCES}+</span></div>
      <nav>
        {FOLLOWS.map((f) => {
          const logo = logoFor(f.name);
          return (
            <div key={f.name} className="follow-row">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="follow-avatar follow-logo" src={logo} alt="" />
              ) : (
                <span className="follow-avatar" style={{ background: f.color }}>{f.initial}</span>
              )}
              {f.name}
            </div>
          );
        })}
        {YT_FOLLOWS.map((f) => (
          <div key={f.name} className="follow-row">
            {/* avatar kênh YouTube (unavatar); nền màu nhạt nếu ảnh chưa tải */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="follow-avatar follow-channel"
              src={sourceAvatar(f.handle, 'youtube') ?? ''}
              alt=""
              style={{ background: f.color }}
            />
            <span className="follow-yt">▶</span>{f.name}
          </div>
        ))}
        {/* Cố ý KHÔNG liệt kê hết — chỉ gợi độ phủ nguồn */}
        <div className="follow-etc">…và hơn {MORE_SOURCES} nguồn uy tín khác</div>
      </nav>
    </aside>
  );
}
