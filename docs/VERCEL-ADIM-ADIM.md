# Vercel deploy — adım adım

Proje hazır; Git commit atıldı. Aşağıdaki yollardan **birini** uygulaman yeterli.

---

## Yol A: GitHub + Vercel (önerilen)

1. **GitHub’da yeni repo oluştur**  
   https://github.com/new → Repo adı: `market-karsilastirma` (veya istediğin). Public/Private fark etmez.

2. **Projeyi GitHub’a push et** (proje klasöründe):
   ```bash
   git remote add origin https://github.com/KULLANICI_ADIN/market-karsilastirma.git
   git branch -M main
   git push -u origin main
   ```
   `KULLANICI_ADIN` yerine kendi GitHub kullanıcı adını yaz.

3. **Vercel’e bağla**  
   - https://vercel.com → GitHub ile giriş yap.  
   - **Add New** → **Project** → Az önce push ettiğin repoyu seç.  
   - **Deploy**’a basma; önce **Environment Variables** kısmına git.

4. **Ortam değişkenlerini ekle** (Settings → Environment Variables veya import sırasında):
   - **`DATABASE_URL`** — Supabase → Project Settings → Database → **Connection string** → "Session pooler" (Transaction). URI’yi kopyala, sonuna `?pgbouncer=true&connection_limit=1` ekle. Şifre kısmına kendi DB şifreni yaz.
   - **`NEXT_PUBLIC_SUPABASE_URL`** — Supabase → Project Settings → API → **Project URL** (örn. `https://bqvthqqnxfuzhgcqiwnh.supabase.co`).
   - **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** — Supabase → Project Settings → API → **anon public** key.
   - **`ADMIN_PASSWORD`** — Admin panel şifresi.  
   - **`CRON_SECRET`** — Rastgele string (örn. `market-cron-2026`).  
   - (İsteğe bağlı) **`DIRECT_URL`** — Sadece Vercel’da migration çalıştıracaksan kullan. Supabase → Database → "Direct connection" (port 5432) URI’si. Projede Prisma sadece `DATABASE_URL` kullanıyor; migration’ı yerelde çalıştırıyorsan boş bırakabilirsin.
   - (İsteğe bağlı) `SESSION_SECRET` — Kullanıcı oturum imzası; yoksa `ADMIN_PASSWORD` kullanılır.

5. **Deploy**’a bas. Build bittikten sonra `https://xxx.vercel.app` linki verilir; bu linki kullanıcılara paylaş.

---

## Yol B: Vercel CLI ile (yerelden)

1. **Vercel’e giriş yap** (bir kez):
   ```bash
   npx vercel login
   ```
   Tarayıcı açılır; Vercel hesabınla giriş yap.

2. **Deploy et** (proje klasöründe):
   ```bash
   npx vercel --prod
   ```
   İlk seferde proje adı ve ayarlar sorulur; enter ile varsayılanları kabul edebilirsin.

3. **Ortam değişkenleri:**  
   Vercel Dashboard → Projen → **Settings** → **Environment Variables** → `.env`’deki değerleri tek tek ekle (DATABASE_URL, ADMIN_PASSWORD, CRON_SECRET, NEXT_PUBLIC_*).  
   Sonra **Redeploy** (Deployments → son deploy → üç nokta → Redeploy).

---

## Deploy sonrası

- **Kullanıcılar:** `https://xxx.vercel.app` → Giriş sayfası (kullanıcı adı + PIN ile kayıt/giriş).  
- **Admin:** `https://xxx.vercel.app/admin` → ADMIN_PASSWORD ile giriş.  
- **Tarama izleme:** `https://xxx.vercel.app/tarama` → Aynı admin şifresi ile giriş.  
- Tarama (fiyat güncelleme) yerelde: `npx tsx scripts/run-full-scan-offline.ts` (NOTLAR bölüm 10).
