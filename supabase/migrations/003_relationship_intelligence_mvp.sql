-- Relationship Intelligence MVP
-- Additive migration only. No tables or columns are dropped.

alter table public.live_lp_records
  add column if not exists geography jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists sector_preferences jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists stage_preferences jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists fund_size_preferences jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists check_size_range jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists emerging_manager_appetite jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists timing_signals jsonb not null default '{"status":"unknown","value":"Unknown","evidenceSource":"","evidenceText":"","lastVerifiedDate":""}'::jsonb,
  add column if not exists relationship_strength text not null default 'Unknown',
  add column if not exists prior_interactions text not null default 'Unknown',
  add column if not exists lp_dna jsonb not null default '{}'::jsonb;

create table if not exists public.relationship_paths (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lp_id uuid references public.live_lp_records(id) on delete cascade,
  source_person text not null,
  target_person text not null,
  path_type text not null check (path_type in ('Direct','First-degree introduction','Second-degree introduction','Weak inferred relationship','No known path')),
  relationship_strength text not null default 'Unknown',
  evidence_source text,
  evidence_text text,
  notes text,
  last_verified_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lp_recommendations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lp_id uuid references public.live_lp_records(id) on delete cascade,
  recommendation_label text not null,
  potential_fit text not null default 'Unknown' check (potential_fit in ('High','Medium','Low','Unknown')),
  why jsonb not null default '[]'::jsonb,
  best_relationship_path_id uuid references public.relationship_paths(id) on delete set null,
  evidence jsonb not null default '[]'::jsonb,
  information_gaps jsonb not null default '[]'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid references public.lp_recommendations(id) on delete cascade,
  lp_id uuid references public.live_lp_records(id) on delete cascade,
  feedback text not null check (feedback in ('Accept','Reject','Already Known','Already Contacted','Not Relevant','Save for Later')),
  rejection_reason text check (rejection_reason is null or rejection_reason in ('Wrong LP type','Wrong check size','Wrong geography','Wrong sector','Wrong timing','No credible warm path','Already allocated','Relationship conflict','Insufficient information','Other')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.lp_outcome_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  lp_id uuid not null references public.live_lp_records(id) on delete cascade,
  recommendation_id uuid references public.lp_recommendations(id) on delete set null,
  outcome_stage text not null check (outcome_stage in ('Suggested','Accepted by GP','Intro Requested','Intro Made','LP Responded','Meeting Held','Follow-up','Diligence','Data Room Requested','Soft Indication','Commitment','Pass')),
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.relationship_paths enable row level security;
alter table public.lp_recommendations enable row level security;
alter table public.recommendation_feedback enable row level security;
alter table public.lp_outcome_events enable row level security;

create policy "users own relationship paths" on public.relationship_paths
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "users own lp recommendations" on public.lp_recommendations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "users own recommendation feedback" on public.recommendation_feedback
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "users own outcome events" on public.lp_outcome_events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists relationship_paths_workspace_lp_idx on public.relationship_paths(workspace_id, lp_id, updated_at desc);
create index if not exists lp_recommendations_workspace_lp_idx on public.lp_recommendations(workspace_id, lp_id, updated_at desc);
create index if not exists recommendation_feedback_workspace_recommendation_idx on public.recommendation_feedback(workspace_id, recommendation_id, created_at desc);
create index if not exists lp_outcome_events_workspace_lp_idx on public.lp_outcome_events(workspace_id, lp_id, occurred_at desc);
