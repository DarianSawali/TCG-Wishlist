create table if not exists public.collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

-- The project keeps "Automatically expose new tables" disabled, so grant
-- table operations explicitly. RLS policies below still restrict every row
-- to its authenticated owner.
grant select, insert, update, delete
on table public.collections
to authenticated;

create policy "Users can read their own collection"
on public.collections for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own collection"
on public.collections for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own collection"
on public.collections for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own collection"
on public.collections for delete
to authenticated
using ((select auth.uid()) = user_id);
