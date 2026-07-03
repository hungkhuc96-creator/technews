-- Cache tóm tắt AI (thêm tay vào DB thật trước đó — nay đưa vào repo cho đồng bộ,
-- để môi trường mới dựng từ migration có đủ cột):
--   posts.video_summary_vi     — ý chính video YouTube (Gemini), cache vĩnh viễn
--   cluster_summaries.detail_vi — bản tóm tắt chi tiết 8-12 câu (Claude), lazy
alter table posts add column if not exists video_summary_vi text;
alter table cluster_summaries add column if not exists detail_vi text;
