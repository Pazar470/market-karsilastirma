# Canlıya bağlama (Supabase) — adımlar

## 1. .env içinde DATABASE_URL

Ağdan “Can't reach database server” alıyorsan **Session pooler** kullan (IPv4 uyumludur). Ayrıntı: **[SUPABASE-BAGLANTI.md](./SUPABASE-BAGLANTI.md)**.

- Supabase Dashboard → **Project Settings** → **Database** → **Connection string**.
- **Session pooler** (Connection pooling) URI’sini kopyala; `[YOUR-PASSWORD]` varsa kendi database şifrenle değiştir.
- `.env` içindeki `DATABASE_URL` satırını bu URI ile **tamamen** değiştir.

Örnek (bölge projene göre değişir):
`postgresql://postgres.bqvthqqnxfuzhgcqiwnh:ŞİFREN@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`

---

## 2. Supabase’te tablolar (tek sefer)

- Supabase Dashboard → **SQL Editor** → **New query**.
- Proje **boşsa** (hiç tablo yoksa): `docs/SUPABASE-SQL-TAMAMI.sql` dosyasının içeriğini kopyala, yapıştır, **Run**.
- Zaten tablolar varsa ve sadece **MarketCategoryMapping** eklemek istiyorsan: Sadece `MarketCategoryMapping` ile ilgili CREATE TABLE + CREATE INDEX + ADD CONSTRAINT kısımlarını çalıştır (aynı dosyada ilgili bölümü kopyalayabilirsin).

---

## 3. Admin şifresi

`.env` içinde `ADMIN_PASSWORD` değişkeni admin panel şifresi. Varsayılan: `market2026`. İstersen değiştir; canlıda mutlaka güçlü bir şifre kullan.

---

## 4. ODS dosya yolu

Kategori import’u için kullanılan ODS dosyası:

- **Tam yol (proje içinde):** `docs/tum_urunler_manuel.ods`

Import komutu (agent veya sen):

`npx tsx scripts/import-category-from-tsv.ts docs/tum_urunler_manuel.ods`

(Bilgisayarında Python + pandas + odfpy kurulu olmalı; yoksa ODS’i LibreOffice’ten TSV olarak kaydedip aynı script’e TSV yolunu ver.)

---

## 5. Ürünleri silip sıfırdan tarama (test için)

Supabase’te ürünleri ve fiyatları silip ODS + tarama ile sıfırdan doldurmak için:

1. **Supabase SQL Editor**’da aşağıdaki SQL’i çalıştır (önce fiyatlar, sonra ürünler silinir; Category ve Market kalır):

```sql
-- Dikkat: Tüm fiyat ve ürün kayıtları silinir. Category ve Market kalır.
DELETE FROM "Price";
DELETE FROM "Product";
```

2. ODS’ten kategori import:  
   `npx tsx scripts/import-category-from-tsv.ts docs/tum_urunler_manuel.ods`

3. Taramayı tetikle: proje kökünden `npx tsx scripts/run-full-scan-offline.ts` (NOTLAR bölüm 10) (sen “market ürün taraması yap”.

4. Sonuç: Ürünler ve fiyatlar ODS’teki kategori yapısı + MarketCategoryMapping’e göre gelecek. Eşleşmeyen market kategorileri **Admin** panelde “onay bekleyen” olarak düşer.

---

## 6. Admin panel ve onay

- **URL:** Sitede `/admin` (kullanıcı arayüzünde link yok; adresi bilen şifreyle girer).
- **Giriş:** Sadece şifre (`.env` → `ADMIN_PASSWORD`). Şifresiz URL ile içeri girilmez.
- Tarama sonrası **categoryId’si null** kalan ürünlerin (market + kategori kodu) listesi burada çıkar; sen kategori yolu seçip **Kaydet** dersin. Bir kez kaydedilen kod sonraki taramalarda otomatik atanır.
