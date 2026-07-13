# Vates'i internete açma rehberi

Bu proje Next.js ile yazıldı. Yayına almak için 3 adım var:
**Supabase** (veritabanı + giriş sistemi) → **GitHub** (kod deposu) → **Vercel** (siteyi yayınlayan yer).

Hesabın zaten Supabase'de var ama proje yok, GitHub reposu da yok — o yüzden hepsini baştan anlatıyorum.

---

## 1) Supabase projesi oluştur

1. https://supabase.com/dashboard adresine gir, hesabınla giriş yap.
2. **New Project** butonuna bas.
3. Bir isim ver (örn. `vates`), bir veritabanı şifresi belirle (bir yere not al), bölge seç (Europe'a yakın bir yer, örn. Frankfurt).
4. Proje oluşana kadar ~1-2 dakika bekle.
5. Sol menüden **SQL Editor**'e gir, **New query** butonuna bas.
6. Bu projedeki `supabase/schema.sql` dosyasının tamamını kopyala, oraya yapıştır, **Run**'a bas.
   - Bu, `profiles` ve `stories` tablolarını, ve herkesin sadece kendi verisini görebilmesini sağlayan güvenlik kurallarını (RLS) oluşturuyor.
7. Sol menüden **Project Settings > API**'ye gir. Orada iki değeri kopyala:
   - **Project URL**
   - **anon public** key

---

## 2) Ortam değişkenlerini ayarla (local test için)

Proje klasöründe `.env.local.example` dosyasını `.env.local` olarak kopyala ve içine yukarıdaki iki değeri yapıştır:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Sonra local'de dene:

```
npm install
npm run dev
```

`http://localhost:3000/signup` üzerinden bir hesap oluşturup dene — Supabase Dashboard > Authentication > Users kısmında yeni kullanıcıyı görmelisin, ve bir hikaye oluşturduğunda Table Editor > stories'de satırı görmelisin.

> Not: Supabase varsayılan olarak e-posta doğrulaması istiyor. Test ederken hızlı gitmek istersen: Dashboard > Authentication > Providers > Email kısmında "Confirm email" seçeneğini kapatabilirsin (yayına alınca tekrar açman önerilir).

---

## 3) GitHub'a yükle

1. https://github.com/new adresinden yeni, **boş** (README'siz) bir repo oluştur (örn. `vates`).
2. Proje klasöründe:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/vates.git
git push -u origin main
```

`.env.local` dosyası `.gitignore` içinde olduğu için GitHub'a **yüklenmeyecek** — anahtarların güvende kalır.

---

## 4) Vercel'e bağla ve yayınla

1. https://vercel.com/new adresine gir, GitHub hesabınla giriş yap.
2. Az önce oluşturduğun `vates` reposunu seç, **Import**.
3. **Environment Variables** kısmına şu ikisini ekle (Supabase'den aldığın değerler):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**'a bas. 1-2 dakika içinde site `senin-proje-adin.vercel.app` adresinde canlı olacak.

Bundan sonra `main` branch'ine her `git push` yaptığında Vercel otomatik olarak yeniden yayınlar.

---

## Sonradan aklına gelirse

- **Kendi alan adın** (örn. vates.app): Vercel > Project > Settings > Domains'ten ekleyebilirsin.
- **E-posta doğrulama mailinin görünümü**: Supabase > Authentication > Email Templates'ten Türkçeleştirebilirsin.
