import Link from 'next/link';

// Footer toàn site — link tới các trang "danh tính" (giới thiệu/liên hệ/chính
// sách). Google đánh giá độ tin cậy site tin tức qua việc nhà xuất bản công khai
// mình là ai; footer là nơi chuẩn để đặt các link này.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span className="site-footer-brand">peek — Liếc phát biết</span>
        <nav className="site-footer-nav">
          <Link href="/gioi-thieu">Giới thiệu</Link>
          <Link href="/lien-he">Liên hệ</Link>
          <Link href="/chinh-sach">Chính sách</Link>
        </nav>
        <span className="site-footer-note">
          Tin tổng hợp có ghi nguồn — bản quyền nội dung gốc thuộc về nguồn phát hành.
        </span>
      </div>
    </footer>
  );
}
