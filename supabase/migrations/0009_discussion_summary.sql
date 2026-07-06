-- Tóm tắt THẢO LUẬN cộng đồng (HN/Reddit) bằng AI — lazy khi bấm vào bài,
-- cache vĩnh viễn (1 bài chỉ tốn 1 lần gọi AI cho mọi người đọc).
-- LƯU Ý vận hành: áp cho CẢ 2 project Supabase (prod + test).
alter table posts add column if not exists discussion_summary_vi text;
