create extension if not exists vector;
create extension if not exists pgcrypto;

create type public.lp_type as enum ('Family Office','Fund of Funds','RIA','Angel Investor','Foundation');
create type public.relationship_heat as enum ('Hot','Warm','Cold');

create table public.lp_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete cascade,
  name text not null, organization text not null, investor_type public.lp_type not null,
  heat public.relationship_heat not null default 'Warm', interests text[] not null default '{}', concerns text[] not null default '{}',
  introduction_source text, introduction_event text, last_contact_date date, next_follow_up date, next_action text,
  meeting_notes text[] not null default '{}', commitment text, commitment_amount numeric, commitment_status text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.documents (id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id) on delete cascade,file_name text not null,file_type text not null,storage_path text,raw_text text,summary text,created_at timestamptz default now());
create table public.memories (id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id) on delete cascade,lp_id uuid references public.lp_profiles(id) on delete cascade,document_id uuid references public.documents(id) on delete set null,kind text not null,content text not null,metadata jsonb default '{}',embedding vector(1536),occurred_at timestamptz,created_at timestamptz default now());
create index memories_embedding_idx on public.memories using hnsw (embedding vector_cosine_ops);
create table public.action_items (id uuid primary key default gen_random_uuid(),owner_id uuid references auth.users(id) on delete cascade,lp_id uuid references public.lp_profiles(id) on delete cascade,title text not null,due_date date,status text default 'open',source_memory_id uuid references public.memories(id) on delete set null,created_at timestamptz default now());

alter table public.lp_profiles enable row level security; alter table public.documents enable row level security; alter table public.memories enable row level security; alter table public.action_items enable row level security;
create policy "users own lp profiles" on public.lp_profiles for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "users own documents" on public.documents for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "users own memories" on public.memories for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);
create policy "users own actions" on public.action_items for all using (auth.uid()=owner_id) with check (auth.uid()=owner_id);

create or replace function public.match_memories(query_embedding vector(1536), match_count int default 8)
returns table(id uuid,lp_id uuid,content text,metadata jsonb,similarity float) language sql stable security invoker as $$
  select m.id,m.lp_id,m.content,m.metadata,1-(m.embedding <=> query_embedding) from public.memories m where m.owner_id=auth.uid() and m.embedding is not null order by m.embedding <=> query_embedding limit match_count;
$$;
