-- ====================================================================
-- AskWell: permission-aware retrieval schema (Supabase / Postgres + pgvector)
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- Security model:
--   * RLS is enabled on every table with no policies, so the public anon key
--     and signed-in Supabase users can read nothing directly.
--   * The only way to read chunks is match_chunks(), which filters by the
--     caller's access rights inside the same query that ranks by similarity.
--     Unauthorized chunks never leave the database.
--   * match_chunks() is executable only by service_role, which is used only on
--     the server. The user id passed in comes from a verified session cookie.
-- ====================================================================

create extension if not exists vector with schema extensions;

-- 1. Users and their access attributes (the server-side directory) -----------
create table if not exists app_users (
  user_id     text primary key,
  name        text not null,
  role        text not null,
  department  text not null,
  clearance   smallint not null check (clearance between 1 and 6)
);

-- 2. Documents and their access tags ------------------------------------------
create table if not exists documents (
  id                  text primary key,
  title               text not null,
  domain              text not null,
  department          text not null,
  classification      text not null check (classification in ('Public', 'Internal', 'Confidential', 'Restricted')),
  min_clearance       smallint not null check (min_clearance between 1 and 6),
  allowed_roles       text[] not null default '{}',  -- empty = any role meeting the clearance
  allowed_departments text[] not null default '{}',  -- empty = any department
  owner               text not null,
  created_at          date not null,
  body                text not null
);

-- 3. Chunks with embeddings. Each chunk inherits its document's access tags ----
create table if not exists chunks (
  id           text primary key,
  document_id  text not null references documents (id) on delete cascade,
  chunk_set    text not null check (chunk_set in ('small', 'medium', 'full')),
  chunk_index  int not null,
  content      text not null,
  embedding    extensions.vector(768) not null
);
create index if not exists chunks_document_set_idx on chunks (document_id, chunk_set);

-- No ANN (HNSW/IVFFlat) index on purpose. At this size (~175 chunks) an exact scan
-- takes a few milliseconds. With an ANN index, a filtered query can return fewer
-- than k rows: the index finds the nearest N first and the permission filter then
-- removes most of them for low-clearance users. At scale, use HNSW with pgvector's
-- iterative index scans (hnsw.iterative_scan) or partition by access tier.

alter table app_users enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;

-- 4. The access rule. Mirrored in lib/access.ts as the eval oracle -------------
create or replace function can_read(u app_users, d documents)
returns boolean
language sql
immutable
as $$
  select u.role = 'SystemAdmin'
      or (    u.clearance >= d.min_clearance
          and (cardinality(d.allowed_roles) = 0 or u.role = any (d.allowed_roles))
          and (cardinality(d.allowed_departments) = 0 or u.department = any (d.allowed_departments)));
$$;

-- 5. Permission-aware similarity search: one query ranks by meaning and filters
--    by access. An unknown user id matches no app_users row, so it returns nothing.
create or replace function match_chunks(
  p_user_id         text,
  p_query_embedding extensions.vector(768),
  p_chunk_set       text,
  p_match_count     int default 5
)
returns table (
  chunk_id       text,
  document_id    text,
  title          text,
  classification text,
  content        text,
  similarity     float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select c.id, d.id, d.title, d.classification, c.content,
         1 - (c.embedding <=> p_query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  join app_users u on u.user_id = p_user_id
  where c.chunk_set = p_chunk_set
    and can_read(u, d)
  order by c.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 20);
$$;

-- 6. Audit only: how many of the unfiltered top-k matches this user could not see.
--    Logged to admin telemetry; never returned to the end user, because even a count
--    tells someone that a restricted document on the topic exists.
create or replace function count_withheld(
  p_user_id         text,
  p_query_embedding extensions.vector(768),
  p_chunk_set       text,
  p_match_count     int default 5
)
returns int
language sql
stable
security definer
set search_path = public, extensions
as $$
  select count(*)::int
  from (
    select c.document_id
    from chunks c
    where c.chunk_set = p_chunk_set
    order by c.embedding <=> p_query_embedding
    limit least(greatest(p_match_count, 1), 20)
  ) top
  join documents d on d.id = top.document_id
  left join app_users u on u.user_id = p_user_id
  where u.user_id is null or not can_read(u, d);
$$;

revoke all on function can_read(app_users, documents) from public, anon, authenticated;
revoke all on function match_chunks(text, extensions.vector, text, int) from public, anon, authenticated;
revoke all on function count_withheld(text, extensions.vector, text, int) from public, anon, authenticated;
grant execute on function match_chunks(text, extensions.vector, text, int) to service_role;
grant execute on function count_withheld(text, extensions.vector, text, int) to service_role;
