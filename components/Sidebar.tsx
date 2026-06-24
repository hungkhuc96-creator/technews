export function Sidebar() {
  const nav = [
    { icon: '🏠', label: 'Trang chủ', active: true },
    { icon: '🔥', label: 'Đang nóng', active: false },
    { icon: '🕐', label: 'Mới nhất', active: false },
  ];
  const sources = ['Tất cả nguồn', 'Báo chí'];
  return (
    <aside className="sidebar">
      <nav>
        {nav.map((n) => (
          <div key={n.label} className={`nav-item${n.active ? ' active' : ''}`}>
            <span>{n.icon}</span>{n.label}
          </div>
        ))}
      </nav>
      <div className="side-title">NGUỒN TIN</div>
      <nav>
        {sources.map((s) => (
          <div key={s} className="nav-item">{s}</div>
        ))}
      </nav>
    </aside>
  );
}
