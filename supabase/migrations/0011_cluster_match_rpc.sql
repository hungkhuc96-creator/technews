-- RPC cho gom cụm bằng pgvector — thay việc kéo toàn bộ centroid ra JS.

-- match_cluster: tìm 1 cụm MỞ gần nhất (cosine) trong cửa sổ thời gian, trên ngưỡng
-- min_score. Trả về payload TÍ XÍU (id + điểm + entities + tiêu đề đại diện) thay vì
-- vector 8 KB → cắt gần hết egress. query_vec nhận float8[] (supabase-js gửi mảng số).
create or replace function match_cluster(query_vec float8[], since_ts timestamptz, min_score float)
returns table(id uuid, score float, entities text[], post_count int, rep_title text)
language sql stable as $$
  with q as (select (query_vec)::vector(384) as v)
  select c.id,
         (1 - (c.centroid_vec <=> q.v))::float as score,
         c.entities,
         c.post_count,
         (select p.title from posts p where p.id = c.representative_post_id) as rep_title
  from clusters c, q
  where c.status = 'open'
    and c.last_updated >= since_ts
    and c.centroid_vec is not null
    and (c.centroid_vec <=> q.v) <= (1 - min_score)   -- cosine >= min_score
  order by c.centroid_vec <=> q.v
  limit 1;
$$;

-- recompute_centroid: tính lại centroid = TRUNG BÌNH embedding các bài trong cụm, NGAY
-- trong DB (avg(vector) của pgvector). Ghi vào jsonb (nguồn gốc) → trigger tự đồng bộ
-- centroid_vec. Không kéo vector nào ra ngoài.
create or replace function recompute_centroid(cid uuid) returns void
language plpgsql as $$
declare v vector(384);
begin
  select avg(embedding_vec) into v from posts
    where cluster_id = cid and embedding_vec is not null;
  if v is not null then
    update clusters set centroid = (v::text)::jsonb where id = cid;
  end if;
end $$;

-- Chặn gọi từ client ẩn danh (app chỉ gọi bằng service key phía server).
revoke execute on function match_cluster(float8[], timestamptz, float) from anon, authenticated;
revoke execute on function recompute_centroid(uuid) from anon, authenticated;
