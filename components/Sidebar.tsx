const NAV = [
  { icon: '🏠', label: 'Trang chủ' },
  { icon: '🔥', label: 'Đang nóng' },
  { icon: '🕐', label: 'Mới nhất' },
  { icon: '▶', label: 'Video' },
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
  { name: 'TechCrunch', initial: 'T', color: '#1d8f3a' },
  { name: 'Ars Technica', initial: 'r', color: '#ff4e00' },
  { name: "Tom's Hardware", initial: 'H', color: '#b5132b' },
  { name: 'The Information', initial: 'i', color: '#ec4d2c' },
  { name: 'CNET', initial: 'C', color: '#d6002a' },
  { name: 'WCCFTech', initial: 'W', color: '#d33a2c' },
  { name: 'Windows Central', initial: 'w', color: '#0078d4' },
  { name: 'Wired', initial: 'x', color: '#262626' },
  { name: 'BGR', initial: 'B', color: '#222222' },
  { name: 'Macworld', initial: 'm', color: '#c98a00' },
  { name: 'NotebookCheck', initial: 'N', color: '#2e7d32' },
  { name: 'AndroidPolice', initial: 'p', color: '#2bb24c' },
  { name: 'Gizmochina', initial: 'z', color: '#e0531a' },
];

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
        {NAV.map((n) => (
          <div
            key={n.label}
            className={`nav-item${activeNav === n.label ? ' active' : ''}`}
            onClick={() => onSelectNav(n.label)}
          >
            <span>{n.icon}</span>
            {n.label}
          </div>
        ))}
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
