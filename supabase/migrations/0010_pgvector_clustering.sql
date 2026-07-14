-- EGRESS FIX: chuyển khớp cụm sang pgvector — tính cosine NGAY trong DB thay vì kéo
-- toàn bộ centroid (8,3 KB/cụm) ra GitHub Actions mỗi 15 phút (thủ phạm ~12 GB/tháng).
-- Cột vector(384) chạy SONG SONG cột jsonb cũ (KHÔNG xoá) — an toàn, mổ cụm vẫn dùng
-- jsonb. Trigger tự đồng bộ vector từ jsonb → code cứ ghi jsonb như cũ, vector luôn khớp.

create extension if not exists vector;

alter table clusters add column if not exists centroid_vec vector(384);
alter table posts    add column if not exists embedding_vec vector(384);

-- Trigger đồng bộ: jsonb đổi (và đủ 384 chiều) → cập nhật cột vector; ngược lại → null.
-- 13 bài lỗi 3-chiều (dữ liệu rác cũ) sẽ để embedding_vec = null, không tham gia khớp.
create or replace function sync_centroid_vec() returns trigger language plpgsql as $$
begin
  if new.centroid is not null and jsonb_array_length(new.centroid) = 384 then
    new.centroid_vec := (new.centroid::text)::vector;
  else
    new.centroid_vec := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_centroid_vec on clusters;
create trigger trg_sync_centroid_vec before insert or update of centroid on clusters
  for each row execute function sync_centroid_vec();

create or replace function sync_embedding_vec() returns trigger language plpgsql as $$
begin
  if new.embedding is not null and jsonb_array_length(new.embedding) = 384 then
    new.embedding_vec := (new.embedding::text)::vector;
  else
    new.embedding_vec := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_embedding_vec on posts;
create trigger trg_sync_embedding_vec before insert or update of embedding on posts
  for each row execute function sync_embedding_vec();

-- Backfill dữ liệu hiện có (server-side, KHÔNG tốn egress).
update clusters set centroid_vec = (centroid::text)::vector
  where centroid is not null and jsonb_array_length(centroid) = 384 and centroid_vec is null;
update posts set embedding_vec = (embedding::text)::vector
  where embedding is not null and jsonb_array_length(embedding) = 384 and embedding_vec is null;

-- Index HNSW cho tìm cosine nhanh (pgvector 0.8 có sẵn).
create index if not exists clusters_centroid_vec_hnsw
  on clusters using hnsw (centroid_vec vector_cosine_ops);
