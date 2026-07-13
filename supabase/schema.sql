-- Vates — Supabase schema
-- Bunu Supabase Dashboard > SQL Editor içinde çalıştır (tamamını kopyala-yapıştır, Run'a bas).

create extension if not exists "pgcrypto";

-- Her kullanıcının profil bilgisi (auth.users tablosuna ek olarak,
-- ad gibi görünen isim bilgisini burada tutuyoruz).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Hikayeler: chapters/characters iç içe (nested) yapılar oldukları için
-- basitlik adına jsonb olarak saklıyoruz; ayrı tablolara bölmeye gerek yok.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled story',
  description text,
  type text not null default 'oneshot' check (type in ('oneshot', 'series')),
  tags jsonb not null default '[]'::jsonb,
  status text not null default 'inProgress',
  streak integer,
  notes text not null default '',
  chapters jsonb not null default '[]'::jsonb,
  characters jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists stories_owner_id_idx on public.stories (owner_id);

-- Row Level Security: herkes sadece kendi verisini görebilsin/değiştirebilsin.
alter table public.profiles enable row level security;
alter table public.stories enable row level security;

drop policy if exists "profiles are self-readable" on public.profiles;
create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles are self-insertable" on public.profiles;
create policy "profiles are self-insertable"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles are self-updatable" on public.profiles;
create policy "profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "stories are owner-readable" on public.stories;
create policy "stories are owner-readable"
  on public.stories for select
  using (auth.uid() = owner_id);

drop policy if exists "stories are owner-insertable" on public.stories;
create policy "stories are owner-insertable"
  on public.stories for insert
  with check (auth.uid() = owner_id);

drop policy if exists "stories are owner-updatable" on public.stories;
create policy "stories are owner-updatable"
  on public.stories for update
  using (auth.uid() = owner_id);

drop policy if exists "stories are owner-deletable" on public.stories;
create policy "stories are owner-deletable"
  on public.stories for delete
  using (auth.uid() = owner_id);

-- Kullanıcı kayıt olunca profiles tablosuna otomatik satır ekle.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Avatar yüklemeleri için storage bucket.
-- Bunu da Supabase Dashboard > SQL Editor'de çalıştırın.
-- İzin verilen dosya tiplerini ve boyut sınırını burada da (uygulama
-- kodundaki kontrole ek olarak, savunma derinliği için) zorunlu kılıyoruz.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB, src/lib/avatar.ts içindeki MAX_AVATAR_BYTES ile aynı
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
