// Logo "peek" — bong bóng chat vàng với hai mắt he hé (đang "liếc") + wordmark.
// Hình bong bóng (3 góc tròn, góc trái-dưới nhọn) là motif bo góc của TOÀN BỘ UI:
// mọi box trong globals.css đều bo theo dạng "r r r ~r/3" để đồng bộ với logo.
export function Logo({ tagline = true }: { tagline?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-bubble" aria-hidden>
        <span className="logo-eye" />
        <span className="logo-eye" />
      </span>
      <span className="logo-text">
        {/* chữ k kề sát (kern âm) đúng theo thiết kế wordmark */}
        <span className="logo-word">pee<span className="logo-k">k</span></span>
        {tagline && <span className="logo-tag">Liếc phát biết</span>}
      </span>
    </span>
  );
}
