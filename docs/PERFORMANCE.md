# Performans ve Stabilite

Bu dokümanda uygulamanın daha hızlı ve kopmasız çalışması için yapılanlar ve **veritabanı tarafında yapmanız gerekenler** özetleniyor.

## Kod tarafında yapılanlar

- **Tek Prisma bağlantısı (singleton):** Tüm sayfa ve API'ler `lib/db` üzerinden aynı `prisma` örneğini kullanıyor. `new PrismaClient()` doğrudan sayfa/route içinde kullanılmıyor; böylece Vercel serverless'ta bağlantı sayısı patlamıyor.
- **Ürün detay sayfası:** Kategori yolu, benzer ürünler ve alternatifler paralel çekiliyor; 10 sn zaman aşımı var. DB yavaşlarsa sayfa yine açılıyor, sadece benzer/alternatif alanları boş kalıyor.
- **Takip butonu:** API cevabı gelene kadar buton yine gösteriliyor (boş yıldız). Cevap gelince dolu/boş güncelleniyor; tıklanınca “hiçbir şey yok” hissi azalıyor.
- **Giriş:** Veritabanı 12 sn içinde yanıt vermezse “Veritabanı geç yanıt verdi, tekrar deneyin” mesajı; istemci tarafında 18 sn timeout.
- **Ürün detayı loading:** `/product/[id]` için `loading.tsx` ile iskelet gösteriliyor; tıklayınca hemen görsel geri bildirim var.
- **Kategoriler:** `/api/categories/tree` 60 sn `unstable_cache` (sunucu) + Cache-Control; ürün API’si kategori listesi 60 sn in-memory cache.
- **Ana sayfa:** Kök `loading.tsx` + Suspense fallback’lerde iskelet; yüklenirken boş ekran yerine placeholder.
- **Veritabanı indeksleri:** `Product` (categoryId, categoryId+isSuspicious), `Notification` (userId), `SmartAlarm` (userId). Sorgular hızlanır. Migration için aşağıdaki “Direct URL” kullanın.

## İki ayrı veritabanı URL'i

| Ortam değişkeni | Ne için | Nerede kullanılır |
|-----------------|--------|--------------------|
| **DATABASE_URL** | Uygulama (Next.js, Vercel) | Pooler URL (port 6543). Tüm web istekleri bunu kullanır. |
| **DIRECT_DATABASE_URL** | Migration + günlük tarama | Direct URL (port 5432). Pooler migration ile takılabildiği, tarama uzun süre tek bağlantı kullandığı için direct daha uygun. |

**.env örneği:** `.env.example` dosyasına bakın. Hem `DATABASE_URL` (pooler) hem `DIRECT_DATABASE_URL` (direct) tanımlayın.

- **Migration:** `npm run migrate:direct` veya `node scripts/migrate-with-direct.cjs` (DIRECT_DATABASE_URL kullanır).
- **Günlük tarama:** `npm run scan:direct` veya `npx tsx scripts/run-offline-scan-with-direct.ts` (DIRECT_DATABASE_URL kullanır).
- **Vercel:** Sadece `DATABASE_URL` = pooler URL tanımlı olsun (direct orada gerekmez).

## Veritabanı tarafında yapmanız gerekenler

Kopma ve yavaşlığın büyük kısmı **Vercel serverless + tek PostgreSQL bağlantısı** kombinasyonundan kaynaklanır. Aşağıdakileri mutlaka uygulayın.

### 1. Connection pooler kullanın

- **Supabase** kullanıyorsanız: Dashboard → Project Settings → Database → **Connection string** kısmında **“Transaction”** (veya Session) pooler’lı olanı seçin.  
  Örnek: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`  
  Doğrudan `:5432` portu yerine **pooler portu (6543)** kullanılmalı.
- Böylece her serverless isteği yeni TCP bağlantı açmak zorunda kalmaz; pool üzerinden kısa sürede bağlantı alır.

### 2. Bağlantı zaman aşımı ekleyin

`DATABASE_URL` sonuna şunu ekleyin (zaten varsa sadece değerleri güncelleyin):

```
?connect_timeout=10
```

Örnek tam URL:

```
postgresql://user:pass@host:6543/dbname?connect_timeout=10
```

Böylece bağlantı kurulamazsa istek sonsuza kadar beklemez.

### 3. Vercel ortam değişkeni

- Vercel → Proje → Settings → Environment Variables  
- `DATABASE_URL` = yukarıdaki **pooler’lı** ve **connect_timeout’lu** URL.  
- Production / Preview için aynı değeri kullanın (veya Preview’da ayrı bir DB kullanıyorsanız onun pooler URL’i).

## Özet

| Konu | Yapılan / Önerilen |
|------|--------------------|
| Prisma | Tek instance (`lib/db`), sayfa/API’de `new PrismaClient()` yok |
| Pooler | Supabase (veya kullandığınız host) **transaction pooler** URL’i kullanılmalı |
| Timeout | `?connect_timeout=10` + giriş/ürün detayında uygulama tarafında timeout |
| Hissedilen hız | Loading skeleton, takip butonu hemen görünür, paralel sorgular + zaman aşımı |

Bu üç adım (pooler + connect_timeout + mevcut kod değişiklikleri) uygulandığında kopma ve “tıklayınca bir şey olmuyor / çok bekliyor” şikayetleri belirgin şekilde azalır.

## Performans kontrol listesi

| Kontrol | Durum |
|--------|--------|
| DATABASE_URL pooler + timeout | .env ve Vercel’de aynı |
| Prisma tek instance (lib/db) | Tüm sayfa/API kullanıyor |
| Kategori ağacı önbelleği | unstable_cache 60 sn + Cache-Control |
| Ürün detayı paralel + timeout | 10 sn, sayfa takılmaz |
| Loading / skeleton | Ana sayfa, ürün detayı |
| DB indeksleri | Migration çalıştırıldı mı? (Supabase SQL veya `npm run migrate:direct`) |
| DATABASE_URL vs DIRECT_DATABASE_URL | Uygulama = pooler; migration/tarama = direct |
