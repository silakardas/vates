-- ---------------------------------------------------------------------
-- Okuma ilerlemesi: bir kullanıcının bir hikayede en son kaldığı yer.
-- chapters ayrı bir tablo değil (stories.chapters içinde jsonb), bu
-- yüzden chapter_id'ye foreign key kuramıyoruz — sadece o hikayenin
-- chapters dizisindeki bir elemanın id'sine karşılık gelen serbest bir
-- metin. Oneshot hikayelerde (tek bölüm) chapter_id anlamsız olduğu için
-- nullable. Primary key (story_id, user_id): her kullanıcının bir
-- hikaye için tek bir "son konum" satırı olur, upsert ile üstüne
-- yazılır — story_likes'taki gibi satır başına tek kayıt mantığı.
create table if not exists public.reading_progress (
  story_id uuid not null references public.stories (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id text,
  -- O bölüm içindeki yaklaşık konum, 0 (başı) ile 1 (sonu) arası.
  scroll_fraction double precision not null default 0
    check (scroll_fraction >= 0 and scroll_fraction <= 1),
  updated_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create index if not exists reading_progress_user_updated_idx
  on public.reading_progress (user_id, updated_at desc);

alter table public.reading_progress enable row level security;

-- story_likes'ın aksine burada "herkes okuyabilsin" yok: bir kullanıcının
-- bir hikayede nerede kaldığı tamamen kişisel/mahrem bir bilgi, sadece
-- kendisi görebilmeli.
drop policy if exists "reading progress is self-readable" on public.reading_progress;
create policy "reading progress is self-readable"
  on public.reading_progress for select
  using (auth.uid() = user_id);

drop policy if exists "reading progress is self-insertable" on public.reading_progress;
create policy "reading progress is self-insertable"
  on public.reading_progress for insert
  with check (auth.uid() = user_id);

-- Upsert (insert ... on conflict do update) hem insert hem update
-- policy'sinin geçmesini gerektirir.
drop policy if exists "reading progress is self-updatable" on public.reading_progress;
create policy "reading progress is self-updatable"
  on public.reading_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reading progress is self-deletable" on public.reading_progress;
create policy "reading progress is self-deletable"
  on public.reading_progress for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Yazar takibi: arkadaşlık gerektirmeyen, tek yönlü bir ilişki.
-- friend_requests'ten farklı olarak burada "kabul" yok — takip etmek
-- tek taraflı bir eylem, karşı tarafın onayına gerek yok.
create table if not exists public.author_follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint author_follows_no_self check (follower_id <> followed_id),
  primary key (follower_id, followed_id)
);

create index if not exists author_follows_followed_idx on public.author_follows (followed_id);
create index if not exists author_follows_follower_idx on public.author_follows (follower_id);

alter table public.author_follows enable row level security;

-- story_likes pattern'indeki gibi: takipçi sayısı herkese açık
-- gösterilebilsin diye kim kimi takip ediyor herkes tarafından
-- okunabilir; sadece kendi follower_id'siyle insert/delete edilebilir.
drop policy if exists "author follows are readable by everyone" on public.author_follows;
create policy "author follows are readable by everyone"
  on public.author_follows for select
  using (true);

drop policy if exists "author follows are self-insertable" on public.author_follows;
create policy "author follows are self-insertable"
  on public.author_follows for insert
  with check (auth.uid() = follower_id);

drop policy if exists "author follows are self-deletable" on public.author_follows;
create policy "author follows are self-deletable"
  on public.author_follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------
-- Friends -> Follows göçü: "friends" (karşılıklı, istek/kabul gerektiren)
-- sistemi kaldırılıp tek yönlü "follow" sistemiyle değiştirildi. Daha
-- önce accepted olan her friend_requests satırı, iki kullanıcının
-- karşılıklı olarak arkadaş olduğu anlamına geliyordu; bu ilişkiyi
-- author_follows'a HER İKİ YÖNDE de yazarak koruyoruz, böylece geçişten
-- sonra önceden arkadaş olan kullanıcılar birbirini otomatik takip
-- ediyor olur ve hiçbir bağlantı kaybolmaz. friend_requests tablosu
-- silinmiyor (geçmiş veri olarak duruyor), sadece artık uygulama
-- tarafından kullanılmıyor. "on conflict do nothing" sayesinde bu blok
-- idempotent: tekrar tekrar çalıştırılabilir.
insert into public.author_follows (follower_id, followed_id)
select sender_id, receiver_id
from public.friend_requests
where status = 'accepted'
on conflict (follower_id, followed_id) do nothing;

insert into public.author_follows (follower_id, followed_id)
select receiver_id, sender_id
from public.friend_requests
where status = 'accepted'
on conflict (follower_id, followed_id) do nothing;