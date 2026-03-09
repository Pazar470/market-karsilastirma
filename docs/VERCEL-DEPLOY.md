# Vercel’e deploy (her yerden erişim)

Bu adımlarla uygulamayı Vercel’e atıp herkese (örn. vandaki ablan) link ile açtırabilirsin.

## 1. Repo’yu GitHub’a at

Projeyi bir GitHub reposuna push et. (Zaten varsa bu adımı atla.)

## 2. Vercel’e bağla

1. [vercel.com](https://vercel.com) → Login (GitHub ile giriş yap).
2. **Add New** → **Project** → Bu repoyu seç.
3. **Framework Preset:** Next.js (otomatik seçilir).
4. **Root Directory:** boş bırak.
5. **Build Command:** `prisma generate && next build` (zaten package.json’da tanımlı).
6. **Output Directory:** boş (Next.js varsayılan).

## 3. Ortam değişkenleri (Environment Variables)

Vercel proje ayarlarında **Settings → Environment Variables** kısmına şunları ekle. Hepsi **Production** (ve istersen Preview) için işaretli olsun.

| Ad | Değer | Gizli? |
|----|--------|--------|
| `DATABASE_URL` | Supabase **Session pooler** URI (Connect penceresinden Method: Session pooler). Sonuna `?pgbouncer=true` ekle. Şifre dahil. | Evet |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bqvthqqnxfuzhgcqiwnh.supabase.co` | Hayır |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API Keys → anon public | Hayır |
| `ADMIN_PASSWORD` | Admin panele giriş şifresi (sadece senin bildiğin) | Evet |
| `CRON_SECRET` | Rastgele uzun bir string (tarama tetiklemek için; örn. `market-cron-2026`) | Evet |
| `SESSION_SECRET` | (İsteğe bağlı) Kullanıcı oturum çerezini imzalamak için. Yoksa `ADMIN_PASSWORD` kullanılır. | Evet |

**Örnek DATABASE_URL (kendi şifreni yaz):**
```
postgresql://postgres.bqvthqqnxfuzhgcqiwnh:ŞİFREN@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

## 4. Deploy

**Deploy** butonuna bas. Build bittikten sonra sana `https://xxx.vercel.app` gibi bir link verir. Bu linki herkes kullanabilir (vandaki abla da girebilir).

## 5. İlk kullanım (sen PC’de yaptıysan atla)

- **Ana sayfa:** Kategori seçip ürün arama, fiyat karşılaştırma.
- **Admin:** `https://xxx.vercel.app/admin` → Şifreyle gir → Bekleyen kategorileri onaylama, tercihleri kaydetme.

## 6. Tarama (fiyat güncelleme)

Tam tarama (Migros, A101, Sok) uzun sürer ve Vercel serverless’ta zaman aşımına girebilir. İki seçenek:

- **Yerelde (tercih):** PC’de `npx tsx scripts/run-full-scan-offline.ts` çalıştır. Veritabanı Supabase’te olduğu için veriler Vercel’deki siteye yansır.
- **Not (cron kullanılmıyor):** İstersen Vercel’de cron tanımlayıp `/api/cron/scan` endpoint’ini tetikleyebilirsin (Authorization: Bearer CRON_SECRET). Şu an cron kullanılmıyor; sadece offline tarama.

## Özet

1. Repo → Vercel’e import.
2. Yukarıdaki env değişkenlerini ekle (özellikle `DATABASE_URL` + `?pgbouncer=true`).
3. Deploy → Linki paylaş. Uygulama her yerden açılır.
