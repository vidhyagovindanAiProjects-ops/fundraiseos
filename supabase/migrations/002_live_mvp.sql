create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My Fund Workspace',
  mode text not null default 'live',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fund_dna_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  original_inputs jsonb not null default '{}',
  source_document jsonb,
  generated_output jsonb not null default '{}',
  status text not null default 'draft',
  prompt_version text,
  model_name text,
  output_status text,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_lp_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  organization text not null,
  lp_type text not null,
  email text not null,
  relationship_owner text not null,
  relationship_source text,
  current_stage text not null default 'Not started',
  estimated_commitment_range text,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, email)
);

create table if not exists public.relationship_timeline_entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lp_id uuid not null references public.live_lp_records(id) on delete cascade,
  entry_type text not null,
  entry_date date not null,
  source text not null,
  summary text not null,
  supporting_text text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_intelligence_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lp_id uuid references public.live_lp_records(id) on delete set null,
  source_text text not null,
  extracted_output jsonb not null default '{}',
  status text not null default 'draft',
  prompt_version text,
  model_name text,
  output_status text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.ai_generation_traces (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete cascade,
  source_table text not null,
  source_record_ids text[] not null default '{}',
  prompt_version text not null,
  model_name text not null,
  output_status text not null,
  created_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;
alter table public.fund_dna_records enable row level security;
alter table public.live_lp_records enable row level security;
alter table public.relationship_timeline_entries enable row level security;
alter table public.meeting_intelligence_records enable row level security;
alter table public.ai_generation_traces enable row level security;

create policy "users own workspaces" on public.workspaces for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users own fund dna" on public.fund_dna_records for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users own live lp records" on public.live_lp_records for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users own timeline entries" on public.relationship_timeline_entries for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users own meeting intelligence" on public.meeting_intelligence_records for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "users own ai traces" on public.ai_generation_traces for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists live_lp_records_workspace_idx on public.live_lp_records(workspace_id);
create index if not exists relationship_timeline_workspace_lp_idx on public.relationship_timeline_entries(workspace_id, lp_id, entry_date desc);
create index if not exists meeting_intelligence_workspace_idx on public.meeting_intelligence_records(workspace_id, created_at desc);
