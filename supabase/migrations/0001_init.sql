-- fitsy initial schema. Run in the Supabase SQL editor or via `supabase db push`.
-- All tables use Row Level Security: a user can only touch their own rows.

create table if not exists public.style_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  body jsonb not null default '{}'::jsonb,          -- height, weight, optional measurements, budget, category
  appearance jsonb not null default '{}'::jsonb,    -- face shape, skin tone, undertone (NO photos)
  preferences jsonb not null default '{}'::jsonb,   -- colours, fit, style, restrictions
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  outfit_key text not null,                         -- client-side outfit id
  outfit jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, outfit_key)
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_key text not null,
  product jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, product_key)
);

create table if not exists public.recommendation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occasions text[] not null default '{}',
  budget integer not null,
  outfit_count integer not null,
  engine text not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_outfits_user_idx on public.saved_outfits(user_id);
create index if not exists wishlist_user_idx on public.wishlist_items(user_id);
create index if not exists history_user_idx on public.recommendation_history(user_id, created_at desc);

alter table public.style_profiles enable row level security;
alter table public.saved_outfits enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.recommendation_history enable row level security;

create policy "own profile" on public.style_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own outfits" on public.saved_outfits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wishlist" on public.wishlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history" on public.recommendation_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Photos are NOT stored by the app by default. This private bucket exists only for a future
-- explicit "save my photo" opt-in; files are scoped to <user_id>/ folders.
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', false)
on conflict (id) do nothing;

create policy "own photos read" on storage.objects
  for select using (bucket_id = 'user-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own photos write" on storage.objects
  for insert with check (bucket_id = 'user-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own photos delete" on storage.objects
  for delete using (bucket_id = 'user-photos' and auth.uid()::text = (storage.foldername(name))[1]);
