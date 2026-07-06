-- Thêm 'hn' (Hacker News) vào danh sách loại nguồn hợp lệ — CẢ 2 bảng đều có
-- ràng buộc loại riêng (posts.source_type + sources.type).
-- LƯU Ý vận hành: migration phải áp cho CẢ 2 project Supabase (prod + test).
alter table posts drop constraint if exists posts_source_type_check;
alter table posts add constraint posts_source_type_check
  check (source_type in ('press', 'youtube', 'reddit', 'x', 'tiktok', 'hn'));

alter table sources drop constraint if exists sources_type_check;
alter table sources add constraint sources_type_check
  check (type in ('press', 'youtube', 'reddit', 'x', 'tiktok', 'hn'));
