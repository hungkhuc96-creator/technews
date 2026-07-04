import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Chính sách — peek',
  description: 'Chính sách quyền riêng tư, nội dung và bản quyền của peek.',
  alternates: { canonical: '/chinh-sach' },
};

export default function ChinhSachPage() {
  return (
    <div className="article-page">
      <header className="article-head">
        <Link href="/" className="logo-link"><Logo /></Link>
        <Link href="/" className="article-home">← Trang chủ</Link>
      </header>
      <main className="article-main static-page">
        <h1 className="article-title">Chính sách</h1>

        <h2>Quyền riêng tư</h2>
        <ul>
          <li>peek không yêu cầu tài khoản, không thu thập thông tin cá nhân của người đọc.</li>
          <li>
            Trang thống kê lượt truy cập ẩn danh (không cookie theo
            dõi, không nhận diện cá nhân) để biết mục nào hữu ích.
          </li>
          <li>Không không chia sẻ dữ liệu cho bên thứ ba.</li>
        </ul>

        <h2>Nội dung &amp; bản quyền</h2>
        <ul>
          <li>
            peek là trang tổng hợp: chỉ hiển thị tóm tắt, trích đoạn ngắn và liên kết về bài
            gốc. Bản quyền nội dung thuộc về nguồn phát hành, được ghi rõ trên từng tin.
          </li>
          <li>
            Tóm tắt tiếng Việt do AI tạo tự động và có thể có sai sót, vui lòng đối chiếu
            bài gốc trước khi trích dẫn lại. peek không chịu trách nhiệm cho quyết định đưa
            ra chỉ dựa trên bản tóm tắt.
          </li>
          <li>
            Yêu cầu điều chỉnh/gỡ nội dung: xem trang <Link href="/lien-he">Liên hệ</Link>.
          </li>
        </ul>

        <h2>Quảng cáo</h2>
        <p>
          peek hiện không chạy quảng cáo. Nếu sau này có, nội dung quảng cáo sẽ được đánh
          dấu rõ ràng, tách bạch khỏi tin tổng hợp.
        </p>
      </main>
    </div>
  );
}
