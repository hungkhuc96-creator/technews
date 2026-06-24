-- Đổi cách lưu embedding sang jsonb (tính cosine ở JS, chưa cần pgvector).
-- Cột cũ vector(1536) đang rỗng nên xóa và tạo lại an toàn.
alter table posts drop column if exists embedding;
alter table posts add column embedding jsonb;

-- Thêm dữ liệu phục vụ gom cụm vào bảng clusters.
alter table clusters add column if not exists centroid jsonb;
alter table clusters add column if not exists entities text[] not null default '{}';
alter table clusters add column if not exists post_count int not null default 0;
