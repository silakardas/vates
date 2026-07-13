# Vates — Kurulum

```
cd vates
npm install
npm run dev
```
Tarayıcıda: `http://localhost:3000`

## Bu Sürümde Eklenenler

**Editör — sidebar, chapters, tags (büyük değişiklik)**
- Sağda sidebar: **Details** (durum, Oneshot/Series, etiket ekleme/silme —
  artık gerçekten çalışıyor) ve **Chapters** sekmeleri
- Series seçilirse bölüm listesi aktifleşiyor, "+ Add chapter" ile yeni
  bölüm eklenip aralarında geçiş yapılabiliyor. Her bölümün kendi başlığı ve
  içeriği var
- Kelime sayısı artık tüm bölümlerin toplamı (`totalWordCount` helper'ı,
  `lib/types.ts`)
- **Başlık kesilme sorunu düzeltildi** — artık tam genişlik kullanıyor
- **Editör artık sayfanın yarısında kalmıyor** — sidebar ile yan yana, kalan
  alanı tam kullanıyor

**Anasayfa — baştan tasarlandı, "eşik" konsepti**
- Artık bir tanıtım/pazarlama sayfası değil — özellik listesi, "why us"
  bölümü kaldırıldı
- Zamana duyarlı selamlama (saat kaçsa ona göre: "Good morning" / "Good
  evening" / gece geç saatte "Still up?")
- Her ziyarette rastgele değişen, kısa şiirsel bir satır (8 varyasyon,
  `lib/greeting.ts` içinde — kolayca çoğaltılabilir)
- Arka planda hafifçe yukarı süzülen kor/ışık parçacıkları (`EmberField`
  component'i, tamamen dekoratif)
- Giriş yapmışsan buton "Enter your atelier" diyip workshop'a götürüyor;
  yapmamışsan "Begin" diyip kayıt sayfasına götürüyor, altta "zaten hesabım
  var" linki de var
- En altta sessiz bir alternatif: "or just start writing, no account
  needed" — hesap açmadan direkt editöre düşebiliyorsun

**Not:** Rastgele satır ve saat bilgisi tarayıcıda (client-side) hesaplanıyor,
bu yüzden sayfa ilk yüklenirken çok kısa bir an boş görünüp sonra beliriyor
— bu bilinçli bir tercih (sunucu ve tarayıcı saatinin/rastgeleliğin
çakışmaması sorununu önlemek için).

## Proje Yapısı (güncellenen kısımlar)

```
src/
├── app/
│   └── page.tsx               → Yeniden yazıldı: atmosferik "eşik" sayfası
├── components/
│   ├── EditorSidebar.tsx      → yeni: Details + Chapters sekmeleri
│   └── EmberField.tsx         → yeni: dekoratif kor parçacıkları
└── lib/
    ├── types.ts                → Story artık chapters[] içeriyor, totalWordCount()
    ├── StoryContext.tsx         → addChapter, updateChapter, addTag, removeTag eklendi
    └── greeting.ts              → yeni: zaman bazlı selamlama + rastgele satırlar
```

## Bu Sürümde Eklenenler (2)

**Supabase entegrasyonu**
- Gerçek kayıt/giriş (Supabase Auth) — `AuthContext.tsx` artık Supabase'e bağlı
- Hikayeler artık kalıcı: `stories` tablosunda, kullanıcıya özel (RLS ile korunuyor)
- Kurulum adımları için bkz. `DEPLOY.md`

## Henüz Yapılmadı

- Gramer kontrolü (LanguageTool)
- Türkçe kelime arama (bilinçli olarak eklenmiyor)
- Mobil ince ayarlar
