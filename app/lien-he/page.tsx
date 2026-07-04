import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Liên hệ — peek',
  description: 'Liên hệ với peek: góp ý, báo lỗi, yêu cầu về nội dung và bản quyền.',
  alternates: { canonical: '/lien-he' },
};

export default function LienHePage() {
  return (
    <div className="article-page">
      <header className="article-head">
        <Link href="/" className="logo-link"><Logo /></Link>
        <Link href="/" className="article-home">← Trang chủ</Link>
      </header>
      <main className="article-main static-page">
        <h1 className="article-title">Liên hệ</h1>
        <p>
          Mọi góp ý, báo lỗi, hợp tác hay yêu cầu liên quan tới nội dung/bản quyền, gửi về:
        </p>
        <p>
          📧 <a href="mailto:hungkhuc96@gmail.com">hungkhuc96@gmail.com</a>
        </p>
        <h2>Yêu cầu về nội dung</h2>
        <p>
          Nếu bạn là đại diện nguồn tin và muốn điều chỉnh hoặc gỡ cách hiển thị nội dung
          của mình trên peek, email cho chúng tôi kèm đường dẫn bài viết — yêu cầu hợp lệ
          sẽ được xử lý trong vòng 48 giờ.
        </p>
      </main>
    </div>
  );
}
