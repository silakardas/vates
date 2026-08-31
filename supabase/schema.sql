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

-- "Writer identity" (bio, favorite line) and a show_writer_identity
-- opt-in flag, so /profile/[username] can mirror the /account page's
-- "Writer identity" / "Meaningful moments" sections — but only for
-- writers who chose to share them. favorite_genre/recurring_universe
-- used to live here too; dropped as part of simplifying the profile
-- (see the username section below) since they turned out to be mostly
-- unused. Any values a writer had already filled in are gone with the
-- columns — nothing preserved them elsewhere.
alter table public.profiles
  add column if not exists bio text,
  add column if not exists favorite_line text,
  add column if not exists show_writer_identity boolean not null default false;

alter table public.profiles
  drop column if exists favorite_genre,
  drop column if exists recurring_universe;

-- IMPORTANT: RLS is row-level, not column-level. The existing "profiles
-- are public-readable" policy makes the whole *row* visible to anyone
-- once its owner has one public story — it can't be taught to hide just
-- these columns while still exposing name/avatar_url. Left alone,
-- anyone could read bio/favorite_line straight off `profiles` via
-- PostgREST even with show_writer_identity left off, since Supabase
-- grants blanket SELECT on public schema tables to anon/authenticated
-- by default. So: revoke that blanket grant and re-grant only the
-- fields that were always meant to be public. bio/favorite_line are
-- deliberately left out of this grant — the only sanctioned way to
-- read them for someone else's profile is the view below, which
-- enforces the opt-in itself. username is included here: it's the
-- public identifier /profile/[username] is looked up by, and it's
-- never gated by show_writer_identity.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, name, avatar_url, created_at, show_writer_identity)
  on public.profiles to anon, authenticated;
-- (UPDATE is untouched by the above, and stays governed by the existing
-- "profiles are self-updatable" RLS policy plus the on_username_change
-- trigger below — an owner can still write their own bio/favorite_line/
-- show_writer_identity/username. They never need to SELECT
-- bio/favorite_line back off this table though: the app reads its own
-- copy from auth.users' metadata, the same place it already reads
-- bio/favoriteLine from today — see AuthContext.tsx. username, unlike
-- those two, IS read back from `profiles` directly, since it's not
-- mirrored into auth metadata — see the username section below.)

-- security_invoker = true (Postgres 15+) makes this view enforce RLS
-- using the *caller's* privileges against the base table, not the view
-- owner's — without it, a plain view would silently bypass everything
-- above. The `where show_writer_identity = true` is the actual opt-in
-- gate: a row (and therefore these fields) only ever comes back
-- through this view for writers who turned the toggle on in Settings.
create or replace view public.profile_writer_identity
with (security_invoker = true) as
select id, bio, favorite_line
from public.profiles
where show_writer_identity = true;

grant select on public.profile_writer_identity to anon, authenticated;

-- Arkadaşlık sistemi: tek tablo, "pending" satırlar bekleyen istek,
-- "accepted" satırlar arkadaşlığın kendisi (ayrı bir friendships tablosu
-- yok — iki kullanıcı, aralarında accepted bir satır varsa arkadaştır).
-- sender_id/receiver_id sırası kimin istek attığını hatırlamak için var;
-- arkadaşlık kurulduktan sonra bu sıra artık anlam taşımıyor.
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  receiver_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_no_self check (sender_id <> receiver_id),
  -- Aynı yönde (aynı sender/receiver) tekrar istek atılmasını engeller;
  -- ters yön (B'nin A'ya atması) ayrı bir satır olarak eklenebilir, ama
  -- uygulama tarafı (src/lib/friends.ts) bunu insert etmeden önce bekleyen
  -- bir ters istek var mı diye kontrol edip varsa onu kabul ediyor.
  constraint friend_requests_unique_pair unique (sender_id, receiver_id)
);

create index if not exists friend_requests_receiver_idx on public.friend_requests (receiver_id, status);
create index if not exists friend_requests_sender_idx on public.friend_requests (sender_id, status);

alter table public.friend_requests enable row level security;

-- Bekleyen/reddedilen istekler sadece iki taraf arasında görünür, ama
-- kabul edilmiş (accepted) satırlar herkese açık: bir profildeki
-- "Arkadaşlar" listesi, girişli olsun olmasın herkes tarafından
-- görülebilmeli.
drop policy if exists "friend requests readable by participants or when accepted" on public.friend_requests;
create policy "friend requests readable by participants or when accepted"
  on public.friend_requests for select
  using (
    status = 'accepted'
    or auth.uid() = sender_id
    or auth.uid() = receiver_id
  );

drop policy if exists "friend requests insertable by sender" on public.friend_requests;
create policy "friend requests insertable by sender"
  on public.friend_requests for insert
  with check (auth.uid() = sender_id);

-- Sadece alıcı isteğe yanıt verebilir (accepted/declined).
drop policy if exists "friend requests updatable by receiver" on public.friend_requests;
create policy "friend requests updatable by receiver"
  on public.friend_requests for update
  using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- Gönderen bekleyen isteğini iptal edebilir, taraflardan biri de kurulu
-- bir arkadaşlığı kaldırabilir (remove friend) — ikisi de aynı silme
-- işlemi.
drop policy if exists "friend requests deletable by either party" on public.friend_requests;
create policy "friend requests deletable by either party"
  on public.friend_requests for delete
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Arkadaşlık özelliği herkesin profiline (sadece public hikayesi
-- olanlara değil) istek atabilmeyi/profillerini görebilmeyi gerektiriyor,
-- bu yüzden id/name/avatar_url artık giriş yapmış herkese açık. Eski
-- "profiles are public-readable" (sadece public hikayesi olanlar) ve bu
-- yeni policy birlikte OR ile birleşiyor, yani anon ziyaretçiler için
-- eski davranış (yalnızca public hikayesi olan yazarların profili) aynen
-- korunuyor — sadece girişli kullanıcılar için genişletildi.
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);
-- Kullanıcı adı (username): profil sayfasının artık UUID yerine
-- /profile/[username] üzerinden erişildiği, akılda kalıcı, kullanıcının
-- kendi seçtiği bir takma ad. Biçim kuralı (yalnızca küçük harf/rakam/
-- alt çizgi, 3-20 karakter) hem check constraint hem de aşağıdaki
-- trigger'da zorlanıyor; unique index de aynı şekilde çift güvence.
alter table public.profiles
  add column if not exists username text,
  add column if not exists username_changed_at timestamptz;

-- Var olan kullanıcılar için (bu sütun ilk eklendiğinde) otomatik bir
-- username üretir: isimden türetilmiş, çakışırsa sonuna sayı eklenmiş
-- bir aday. handle_new_user() de kayıt anında aynısını çağırıyor.
create or replace function public.generate_username_from_name(p_name text)
returns text
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix int := 0;
begin
  base := lower(regexp_replace(coalesce(p_name, ''), '[^a-zA-Z0-9]+', '', 'g'));
  base := left(base, 20);
  if base = '' then
    base := 'writer';
  end if;
  if length(base) < 3 then
    base := rpad(base, 3, '0');
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 20 - length(suffix::text)) || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- Bu script her rerun edildiğinde sadece username'i hâlâ boş olan
-- satırları doldurur (if not exists ile eklenen sütun ilk kez
-- oluşturulduğunda ya da yeni bir satır bir şekilde boş kaldıysa).
update public.profiles
set username = public.generate_username_from_name(name)
where username is null;

alter table public.profiles
  alter column username set not null;

drop index if exists profiles_username_idx;
create unique index profiles_username_idx on public.profiles (username);

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');

-- Kayıt anında da bir username üretilsin diye handle_new_user()'ı
-- güncelliyoruz — yukarıdaki (satır ~74) tanımın yerini alır, aynı
-- trigger'a bağlı kalmaya devam eder.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, name, username)
  values (new.id, v_name, public.generate_username_from_name(v_name));
  return new;
end;
$$;

-- Biçim/rezerve kelime/haftalık soğuma-süresi (cooldown) kontrolünü tek
-- bir yerden zorunlu kılar — ister app RPC'siz doğrudan
-- `.from('profiles').update({ username })` çağırsın, ister ileride
-- başka bir yol eklensin, hepsi buradan geçer. Aynı username'i tekrar
-- kaydetmek (NEW = OLD) cooldown'u hiç tetiklemez.
create or replace function public.enforce_username_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  -- Mevcut route'larla çakışmasın diye rezerve edilen kullanıcı adları.
  v_reserved text[] := array[
    'admin', 'api', 'settings', 'profile', 'account', 'login', 'logout',
    'signup', 'discover', 'challenge', 'workshop', 'story', 'terms',
    'privacy', 'forgot-password', 'reset-password', 'help', 'support',
    'about', 'null', 'undefined', 'vates'
  ];
begin
  if new.username is distinct from old.username then
    if new.username !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'Username must be 3-20 characters: lowercase letters, numbers, and underscores only.';
    end if;

    if new.username = any(v_reserved) then
      raise exception 'That username is reserved.';
    end if;

    if old.username_changed_at is not null
       and now() - old.username_changed_at < interval '7 days' then
      raise exception 'You can change your username again on %.',
        to_char(old.username_changed_at + interval '7 days', 'YYYY-MM-DD');
    end if;

    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_username_change on public.profiles;
create trigger on_username_change
  before update on public.profiles
  for each row execute function public.enforce_username_change();
