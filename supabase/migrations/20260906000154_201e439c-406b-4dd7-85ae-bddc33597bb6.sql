create type public.application_status as enum ('interested','applied','interview','accepted','rejected');

create table public.application_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.application_status not null default 'interested',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, opportunity_id)
);

grant select, insert, update, delete on public.application_tracking to authenticated;
grant all on public.application_tracking to service_role;

alter table public.application_tracking enable row level security;

create policy "Users manage their own tracking records"
on public.application_tracking for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger application_tracking_set_updated_at before update on public.application_tracking
for each row execute function set_updated_at();