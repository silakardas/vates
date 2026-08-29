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

-- Community altyapısı: hikayeleri herkese açık paylaşılabilir hale getirmenin
-- temeli (is_public/published_at) ve basit etkileşim sayaçları.
alter table public.stories
  add column if not exists is_public boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists view_count integer not null default 0,
  add column if not exists like_count integer not null default 0;

-- Mevcut "stories are owner-readable" policy'sine ek olarak: is_public=true
-- olan hikayeler anon dahil herkes tarafından okunabilsin.
drop policy if exists "stories are public-readable" on public.stories;
create policy "stories are public-readable"
  on public.stories for select
  using (is_public = true);

  -- /discover sayfası her hikayenin yazar adını gösterebilsin diye:
-- mevcut "profiles are self-readable" policy'sine ek olarak, en az bir
-- public hikayesi olan kullanıcıların profili (sadece id/name'i) herkes
-- tarafından okunabilsin. Public hikayesi olmayan kullanıcıların profili
-- bu policy'yle açılmıyor.
drop policy if exists "profiles are public-readable" on public.profiles;
create policy "profiles are public-readable"
  on public.profiles for select
  using (
    exists (
      select 1 from public.stories
      where stories.owner_id = profiles.id
        and stories.is_public = true
    )
  );

-- /discover/[id] okuma sayfası her açılışta bunu çağırır. view_count'u
-- +1 artırmak için ziyaretçinin (anon dahil) UPDATE izni olması gerekir,
-- ama mevcut "stories are owner-updatable" policy'si bunu sadece sahibine
-- veriyor — bu yüzden security definer ile RLS'yi bypass ediyoruz.
-- "update ... set view_count = view_count + 1" atomik bir artış olduğu
-- için, aynı anda gelen birden çok görüntülenmede sayaç kaybı (race
-- condition) olmaz. Savunma derinliği için yalnızca is_public = true
-- olan hikayelerde güncelleme yapıyoruz.
create or replace function public.increment_story_view(p_story_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.stories
  set view_count = view_count + 1
  where id = p_story_id
    and is_public = true;
end;
$$;

grant execute on function public.increment_story_view(uuid) to anon, authenticated;

-- Yorumlar. Tekil bir tablo yeterli — thread/reply yapısı yok, düz liste.
create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists story_comments_story_id_idx on public.story_comments (story_id);

alter table public.story_comments enable row level security;

-- Sadece is_public=true olan hikayelerin yorumları herkese (anon dahil)
-- açık — story_likes'taki "herkes select edebilsin" politikasından farklı
-- olarak burada hikayenin public olup olmadığını da kontrol ediyoruz,
-- çünkü yorum metni like'ın aksine hassas/serbest metin içerebilir.
drop policy if exists "story comments are readable on public stories" on public.story_comments;
create policy "story comments are readable on public stories"
  on public.story_comments for select
  using (
    exists (
      select 1 from public.stories
      where stories.id = story_comments.story_id
        and stories.is_public = true
    )
  );

drop policy if exists "story comments are self-insertable" on public.story_comments;
create policy "story comments are self-insertable"
  on public.story_comments for insert
  with check (auth.uid() = user_id);

-- Bir yorumu ya kendi yazarı, ya da o yorumun ait olduğu hikayenin sahibi
-- silebilir (moderasyon amaçlı).
drop policy if exists "story comments are deletable by author or story owner" on public.story_comments;
create policy "story comments are deletable by author or story owner"
  on public.story_comments for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.stories
      where stories.id = story_comments.story_id
        and stories.owner_id = auth.uid()
    )
  );

-- Moderasyon kuyruğu: hikaye veya yorum raporları. story_id/comment_id
-- nullable çünkü bir rapor ikisinden sadece birine (hangisi
-- raporlanıyorsa) ait olur; reporter_id nullable çünkü anon kullanıcı da
-- raporlayabilsin diye giriş şartı yok.
create table if not exists public.story_reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories (id) on delete cascade,
  comment_id uuid references public.story_comments (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

alter table public.story_reports enable row level security;

-- Bilinçli olarak select/update policy'si YOK: raporlar sadece service
-- role (Dashboard/SQL Editor) üzerinden görülüp işlenebilsin, ne raporu
-- gönderen ne de raporlanan kişi kendi raporunu (ya da başkasınınkini)
-- select/update edemesin.
drop policy if exists "story reports are insertable by anyone" on public.story_reports;
create policy "story reports are insertable by anyone"
  on public.story_reports for insert
  with check (
    -- Anon rapor edebilsin diye reporter_id null olabilir; girişliyse de
    -- başkasının adına rapor atmasın diye kendi id'si olmak zorunda.
    reporter_id is null or reporter_id = auth.uid()
  );

-- Beğeniler: kim hangi hikayeyi beğenmiş, tek tek satır olarak. like_count
-- artık burada elle değil, aşağıdaki trigger ile otomatik tutuluyor.
create table if not exists public.story_likes (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.story_likes enable row level security;

-- like_count'u herkes görebildiği için (discover kartları/sayfası), kimin
-- neyi beğendiğini de herkes okuyabilsin — bu sayede sayfa yüklenirken
-- "bu kullanıcı bunu beğenmiş mi" kontrolü de aynı tabloyla yapılabiliyor.
drop policy if exists "story likes are readable by everyone" on public.story_likes;
create policy "story likes are readable by everyone"
  on public.story_likes for select
  using (true);

drop policy if exists "story likes are self-insertable" on public.story_likes;
create policy "story likes are self-insertable"
  on public.story_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "story likes are self-deletable" on public.story_likes;
create policy "story likes are self-deletable"
  on public.story_likes for delete
  using (auth.uid() = user_id);

-- stories.like_count'u story_likes'daki insert/delete'e göre otomatik
-- +1/-1 günceller, böylece client'ın increment_story_view gibi ayrı bir
-- RPC çağırmasına gerek kalmıyor — bir satır eklemek/silmek yeterli.
-- security definer: beğenen kişi genelde hikayenin sahibi olmadığından,
-- "stories are owner-updatable" policy'si bu güncellemeye izin vermez;
-- trigger bunu bypass ediyor. greatest(...,0) sayaç hiç negatife
-- düşmesin diye (ör. eşzamanlı silme durumlarında) bir güvenlik payı.
create or replace function public.handle_story_like_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.stories set like_count = like_count + 1 where id = new.story_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.stories set like_count = greatest(like_count - 1, 0) where id = old.story_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_story_like_change on public.story_likes;
create trigger on_story_like_change
  after insert or delete on public.story_likes
  for each row execute function public.handle_story_like_change();

-- Herkese açık profil sayfası (/profile/[userId]) bir avatar göstermek
-- istiyor, ama bugün avatar_url auth.users.raw_user_meta_data içinde
-- tutuluyor (bkz. AuthContext.updateAvatar) ve o alan PostgREST üzerinden
-- dışarıya açık değil. profiles tablosuna aynı URL'yi de yazarak, zaten
-- var olan "profiles are public-readable" policy'si (en az bir public
-- hikayesi olan kullanıcılar için) üzerinden herkese açık okunabilir hale
-- getiriyoruz.
alter table public.profiles
  add column if not exists avatar_url text;

-- AO3-style tag categories: kept as the same simple jsonb-array pattern the
-- old single `tags` column used, just split four ways instead of one — no
-- separate tags table, this app is small enough that it doesn't need one.
-- `tag_characters` (not `characters`) to avoid colliding with the existing
-- `characters` column, which stores story-map character sheets, not tags.
-- The old `tags` column is left in place (not dropped, not written to
-- anymore) purely so the app can migrate any pre-existing values into
-- `additional_tags` the first time each story is opened/saved after this
-- change, without losing data.
alter table public.stories
  add column if not exists fandoms jsonb not null default '[]'::jsonb,
  add column if not exists relationships jsonb not null default '[]'::jsonb,
  add column if not exists tag_characters jsonb not null default '[]'::jsonb,
  add column if not exists additional_tags jsonb not null default '[]'::jsonb;

-- /profile/[userId] "words written" stat: derived straight from chapters
-- (same numbers totalWordCount() computes client-side for /account), kept
-- as a generated column so it's always correct — no risk of a stale or
-- spoofed value ever being trusted, and no need to select/ship the full
-- `chapters` jsonb (chapter HTML content included) just to add up a
-- number. Since it lives on the stories row itself, it's already gated by
-- the exact same RLS as everything else on that row: readable by the
-- owner always, and by anyone else only when is_public = true. A draft's
-- word_count is therefore exactly as private as the draft itself.
alter table public.stories
  add column if not exists word_count integer generated always as (
    (select coalesce(sum((chapter->>'wordCount')::int), 0)
     from jsonb_array_elements(chapters) as chapter)
  ) stored;

-- "Writer identity" (bio, favorite genre/universe, favorite line) and a
-- show_writer_identity opt-in flag, so /profile/[userId] can mirror the
-- /account page's "Writer identity" / "Meaningful moments" sections —
-- but only for writers who chose to share them.
alter table public.profiles
  add column if not exists bio text,
  add column if not exists favorite_genre text,
  add column if not exists recurring_universe text,
  add column if not exists favorite_line text,
  add column if not exists show_writer_identity boolean not null default false;

-- IMPORTANT: RLS is row-level, not column-level. The existing "profiles
-- are public-readable" policy makes the whole *row* visible to anyone
-- once its owner has one public story — it can't be taught to hide just
-- these four columns while still exposing name/avatar_url. Left alone,
-- anyone could read bio/favorite_genre/recurring_universe/favorite_line
-- straight off `profiles` via PostgREST even with show_writer_identity
-- left off, since Supabase grants blanket SELECT on public schema tables
-- to anon/authenticated by default. So: revoke that blanket grant and
-- re-grant only the fields that were always meant to be public. The
-- four opt-in fields are deliberately left out of this grant — the only
-- sanctioned way to read them for someone else's profile is the view
-- below, which enforces the opt-in itself.
revoke select on public.profiles from anon, authenticated;
grant select (id, name, avatar_url, created_at, show_writer_identity)
  on public.profiles to anon, authenticated;
-- (UPDATE is untouched by the above, and stays governed by the existing
-- "profiles are self-updatable" RLS policy — an owner can still write
-- their own bio/favorite_genre/recurring_universe/favorite_line/
-- show_writer_identity. They never need to SELECT them back off this
-- table though: the app reads its own copy from auth.users' metadata,
-- the same place it already reads bio/favoriteGenre/etc. from today —
-- see AuthContext.tsx.)

-- security_invoker = true (Postgres 15+) makes this view enforce RLS
-- using the *caller's* privileges against the base table, not the view
-- owner's — without it, a plain view would silently bypass everything
-- above. The `where show_writer_identity = true` is the actual opt-in
-- gate: a row (and therefore these four fields) only ever comes back
-- through this view for writers who turned the toggle on in Settings.
create or replace view public.profile_writer_identity
with (security_invoker = true) as
select id, bio, favorite_genre, recurring_universe, favorite_line
from public.profiles
where show_writer_identity = true;

grant select on public.profile_writer_identity to anon, authenticated;