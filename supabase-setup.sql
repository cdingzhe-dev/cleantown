-- CleanTown shared database schema for the hackathon prototype.
-- IMPORTANT: These policies are intentionally permissive for a controlled demo.
-- Do NOT use them for a public production deployment. Replace with Supabase Auth
-- and role-based policies before launch; the current login UI is simulated only.

create table if not exists public.cleantown_reports (
  id text primary key,
  type text not null,
  location text not null,
  details text not null,
  status text not null default 'Submitted' check (status in ('Submitted','In progress','Resolved')),
  time text not null default 'Just now',
  created bigint not null default (extract(epoch from now()) * 1000)::bigint,
  lat double precision,
  lng double precision,
  constraint cleantown_reports_lat_range check (lat is null or lat between -90 and 90),
  constraint cleantown_reports_lng_range check (lng is null or lng between -180 and 180)
);

create table if not exists public.cleantown_facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('recycling','bin')),
  address text not null,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  notes text not null default '',
  verified boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists cleantown_reports_created_idx on public.cleantown_reports (created desc);
create index if not exists cleantown_facilities_kind_idx on public.cleantown_facilities (kind);

alter table public.cleantown_reports enable row level security;
alter table public.cleantown_facilities enable row level security;

-- Prototype-only public policies: any visitor with the anon key can read/write.
drop policy if exists "demo reports select" on public.cleantown_reports;
drop policy if exists "demo reports insert" on public.cleantown_reports;
drop policy if exists "demo reports update" on public.cleantown_reports;
create policy "demo reports select" on public.cleantown_reports for select to anon, authenticated using (true);
create policy "demo reports insert" on public.cleantown_reports for insert to anon, authenticated with check (true);
create policy "demo reports update" on public.cleantown_reports for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo facilities select" on public.cleantown_facilities;
drop policy if exists "demo facilities insert" on public.cleantown_facilities;
drop policy if exists "demo facilities delete" on public.cleantown_facilities;
drop policy if exists "demo facilities update" on public.cleantown_facilities;
create policy "demo facilities select" on public.cleantown_facilities for select to anon, authenticated using (true);
create policy "demo facilities insert" on public.cleantown_facilities for insert to anon, authenticated with check (true);
create policy "demo facilities delete" on public.cleantown_facilities for delete to anon, authenticated using (true);
create policy "demo facilities update" on public.cleantown_facilities for update to anon, authenticated using (true) with check (true);

-- Enable Realtime replication for cross-device updates. Safe to run more than once.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cleantown_reports') then
    alter publication supabase_realtime add table public.cleantown_reports;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cleantown_facilities') then
    alter publication supabase_realtime add table public.cleantown_facilities;
  end if;
end $$;
