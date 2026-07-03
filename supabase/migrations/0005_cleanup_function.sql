-- Hàm dọn DB (gọi hằng tuần qua scripts/cleanup.ts → client.rpc('cleanup_db')):
--   (1) Xóa cụm ARCHIVE quá `archive_days` ngày + bài của chúng (kiểm soát phình DB).
--   (2) Xóa cụm RỖNG (không còn bài nào trỏ tới) — vô hại, không mất bài nào.
-- Chạy trong 1 transaction, xử lý đúng thứ tự khóa ngoại (gỡ representative_post_id,
-- xóa summary, xóa posts, rồi mới xóa clusters).
create or replace function cleanup_db(archive_days integer default 30)
returns table(old_clusters integer, old_posts integer, empty_clusters integer)
language plpgsql
set search_path = public
as $$
declare
  v_old uuid[];
  v_old_posts integer := 0;
  v_old_count integer := 0;
  v_empty integer := 0;
begin
  -- (1) Cụm archive quá hạn
  select coalesce(array_agg(id), '{}') into v_old
  from clusters
  where status = 'archived'
    and last_updated < now() - make_interval(days => archive_days);
  v_old_count := coalesce(array_length(v_old, 1), 0);

  select count(*) into v_old_posts from posts where cluster_id = any(v_old);

  update clusters set representative_post_id = null where id = any(v_old);
  delete from cluster_summaries where cluster_id = any(v_old);
  delete from posts where cluster_id = any(v_old);
  delete from clusters where id = any(v_old);

  -- (2) Cụm rỗng: dọn summary mồ côi trước, rồi xóa cụm
  delete from cluster_summaries s
  where not exists (select 1 from posts p where p.cluster_id = s.cluster_id);

  with empties as (
    delete from clusters c
    where not exists (select 1 from posts p where p.cluster_id = c.id)
    returning 1
  )
  select count(*) into v_empty from empties;

  return query select v_old_count, v_old_posts, v_empty;
end;
$$;
