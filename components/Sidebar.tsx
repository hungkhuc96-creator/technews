const NAV = [
  { icon: '🏠', label: 'Trang chủ', active: true },
  { icon: '🔥', label: 'Đang nóng', active: false },
  { icon: '🕐', label: 'Mới nhất', active: false },
  { icon: '▶', label: 'Video', active: false },
];

const SOURCES: { key: string; icon: string; label: string }[] = [
  { key: 'press', icon: '📰', label: 'Báo chí' },
  { key: 'youtube', icon: '▶', label: 'YouTube' },
  { key: 'reddit', icon: '👽', label: 'Reddit' },
  { key: 'x', icon: '𝕏', label: 'X' },
  { key: 'tiktok', icon: '♪', label: 'TikTok' },
];

// Danh sách "Theo dõi" (nguồn báo) — tĩnh, lấy từ thiết kế.
const FOLLOWS = [
  { name: 'The Verge', initial: 'V', color: '#5b34da' },
  { name: '9to5Mac', initial: '9', color: '#0a84ff' },
  { name: '9to5Google', initial: 'g', color: '#1a73e8' },
  { name: 'Engadget', initial: 'E', color: '#2d8c8c' },
  { name: 'MacRumors', initial: 'M', color: '#e0244b' },
  { name: 'Android Authority', initial: 'A', color: '#3ddc84' },
  { name: 'GSMArena', initial: 'G', color: '#cf2e2e' },
];

export function Sidebar({ counts }: { counts: Record<string, number> }) {
  return (
    <aside className="sidebar">
      <nav>
        {NAV.map((n) => (
          <div key={n.label} className={`nav-item${n.active ? ' active' : ''}`}>
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
      </nav>

      <div className="side-title"><span>LỌC NGUỒN</span></div>
      <nav>
        <div className="src-item active">
          <span>◎</span>
          <span className="src-label">Tất cả nguồn</span>
        </div>
        {SOURCES.map((s) => (
          <div key={s.key} className="src-item">
            <span>{s.icon}</span>
            <span className="src-label">{s.label}</span>
            {counts[s.key] > 0 && <span className="src-badge">{counts[s.key]}</span>}
          </div>
        ))}
      </nav>

      <div className="side-title"><span>THEO DÕI</span><span>{FOLLOWS.length}</span></div>
      <nav>
        {FOLLOWS.map((f) => (
          <div key={f.name} className="follow-row">
            <span className="follow-avatar" style={{ background: f.color }}>{f.initial}</span>
            {f.name}
          </div>
        ))}
      </nav>
    </aside>
  );
}
