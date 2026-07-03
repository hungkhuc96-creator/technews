-- Ghi lại cụm tin đã lên bản tin Telegram → hôm sau không gửi trùng.
create table if not exists digest_log (
  cluster_id uuid primary key references clusters(id) on delete cascade,
  sent_at timestamptz not null default now()
);
create index if not exists digest_log_sent_at_idx on digest_log(sent_at);
alter table digest_log enable row level security;
