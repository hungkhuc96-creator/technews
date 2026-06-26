-- Tiêu đề tiếng Việt cho mỗi cụm (do AI dịch) + ảnh thumbnail của bài.
alter table cluster_summaries add column if not exists title_vi text;
alter table posts add column if not exists image_url text;
