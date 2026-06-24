create extension if not exists vector;

create table sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('press','youtube','reddit','x','tiktok')),
  name text not null,
  config jsonb not null default '{}',          -- feed_url / channel_id / subreddit / x_handle / tiktok_query
  authority_weight real not null default 1,
  created_at timestamptz not null default now(),
  unique (type, name)
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  source_type text not null check (source_type in ('press','youtube','reddit','x','tiktok')),
  external_id text not null,
  title text not null,
  text text not null default '',
  url text not null,
  author text,
  published_at timestamptz not null,
  lang text,
  metrics jsonb not null default '{}',
  entities text[] not null default '{}',       -- chỉ dùng cho báo chí
  embedding vector(1536),                       -- chỉ dùng cho báo chí
  cluster_id uuid,                              -- chỉ dùng cho báo chí
  fetched_at timestamptz not null default now(),
  unique (source_type, external_id)
);
create index posts_published_at_idx on posts (published_at desc);

create table clusters (
  id uuid primary key default gen_random_uuid(),
  representative_post_id uuid references posts(id) on delete set null,
  topic text,
  n_sources int not null default 1,
  source_types text[] not null default '{}',
  first_seen timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  heat_score double precision not null default 0,
  status text not null default 'open' check (status in ('open','archived'))
);
alter table posts add constraint posts_cluster_fk
  foreign key (cluster_id) references clusters(id) on delete set null;

create table cluster_summaries (
  cluster_id uuid primary key references clusters(id) on delete cascade,
  summary_vi text not null,
  bullets_vi jsonb not null default '[]',
  input_hash text not null,
  generated_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default gen_random_uuid(),
  cluster_id uuid references clusters(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  user_id uuid,
  body text not null,
  created_at timestamptz not null default now()
);
