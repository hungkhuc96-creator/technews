import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: 'Giới thiệu — peek',
  description: 'peek là gì, tin được tổng hợp và tóm tắt như thế nào.',
  alternates: { canonical: '/gioi-thieu' },
};

export default function GioiThieuPage() {
  return (
    <div className="article-page">
      <header className="article-head">
        <Link href="/" className="logo-link"><Logo /></Link>
        <Link href="/" className="article-home">← Trang chủ</Link>
      </header>
      <main className="article-main static-page">
        <h1 className="article-title">Giới thiệu về peek</h1>

        <p>
          <strong>peek</strong> (đọc là “pík”) - <em>Liếc phát biết</em>, là trang tổng hợp
          tin công nghệ nước ngoài dành cho người đọc Việt. Mục tiêu rất đơn giản: bạn chỉ cần
          liếc vài phút là biết hôm nay giới công nghệ thế giới có gì nóng, không cần đọc
          tiếng Anh, không cần mở hai chục trang báo.
        </p>

        <h2>peek hoạt động thế nào?</h2>
        <ul>
          <li>
            <strong>Tổng hợp liên tục:</strong> hệ thống tự động theo dõi hơn 20 trang công nghệ
            uy tín, kênh YouTube và tài khoản X
            của các nhân vật ảnh hưởng trong ngành, cập nhật mỗi 15 phút.
          </li>
          <li>
            <strong>Gộp tin cùng sự kiện:</strong> nhiều báo cùng đưa một tin sẽ được gộp thành
            một cụm, kèm số nguồn xác nhận. Tin càng nhiều nguồn đưa càng đáng tin.
          </li>
          <li>
            <strong>Tóm tắt bằng AI:</strong> mỗi tin được AI tóm tắt sang tiếng Việt, ngắn gọn
            và giữ số liệu chính. Nội dung tóm tắt do máy tạo và có thể sai sót — bài gốc luôn
            được dẫn link để bạn kiểm chứng.
          </li>
          <li>
            <strong>Xếp theo “độ nóng”:</strong> thuật toán riêng cân giữa độ mới, số nguồn
            xác nhận và tốc độ lan truyền để tin đáng chú ý nhất luôn nổi lên đầu.
          </li>
        </ul>

        <h2>Nguyên tắc nội dung</h2>
        <p>
          peek là trang tổng hợp: chúng tôi chỉ hiển thị <strong>tóm tắt, trích đoạn ngắn và
            liên kết về bài gốc</strong>. Bản quyền nội dung thuộc về nguồn phát hành, và mọi tin
          đều ghi rõ nguồn kèm nút “Mở bài gốc”. Nếu bạn là đại diện của nguồn tin và muốn
          điều chỉnh cách hiển thị, hãy <Link href="/lien-he">liên hệ</Link>.
        </p>

        <h2>Ai đứng sau peek?</h2>
        <p>
          peek là dự án độc lập của một người làm sản phẩm tại Việt Nam, vận hành tự động
          24/7.
        </p>
      </main>
    </div>
  );
}
