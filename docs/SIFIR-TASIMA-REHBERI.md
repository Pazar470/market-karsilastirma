# Sıfır Taşıma Rehberi (Teknik)

Bu dosya, sistemin güncel iş kurallarını ve taşınacak/korunacak dosya listesini içerir. Önce `docs/OZET-BASIT.md` okunmalı; teknik detay ve dosya eşlemesi burada.

---

## 1. İş kuralları (OZET-BASIT ile uyumlu)

- **Tarama:** run-full-scan-offline (veya run-offline-scan-with-direct). Önce kategori keşfi (Migros, A101, Şok), sonra ürün indirme, sonra DB’ye toplu yazma. A101’de nitelikAdi her üründe alınmalı; sadece GeçiciDelist ve GrupSpot şüpheli işaretlenir (suspiciousAtPrice ile), şüpheliler kullanıcıya gösterilmez.
- **Şüpheli:** Sadece A101 nitelikAdi’na göre (GeçiciDelist, GrupSpot). Fiyat sapmasıyla (örn. Şok/Migros’ta %80 aşağı) şüpheli işaretleme **kullanılmaz**.
- **Ürün modeli:** Her marketten gelen kayıt ayrı Product; aynı “ürün” farklı markette olsa bile tek kartta “hangi markette ne kadar” listesi yok.
- **Alarm:** İstediği kadar kategori + istediği kadar tekil ürün; onay sayfasında dahil/hariç ve ayarlar. **Etiket (tags) filtresi kullanılmıyor**; alarm mantığında etiket zorunlu değil (schema’da tags alanı kalabilir). En güncel alarm akışı: alarms/new (kategori + ürün seçimi) → onay → ayarlar → kaydet; alarms/[id]/edit (sonuçlar / ayarlar).
- **Arama:** Kategori tıklanınca `q` temizlenir; arama submit edilince varsayılan olarak categoryId temizlenir. “Sadece bu kategoride ara” işaretliyken arama yapılırsa categoryId korunur. Arama terimleri boşlukla ayrılıp her terim `contains` ile aranır (sıra önemsiz; “tor t yağl s” gibi kısmi eşleşme mümkün).

---

## 2. Tarama ve veri akışı (dosya eşlemesi)

| Ne | Dosya(lar) |
|----|------------|
| Ana tarama | `scripts/run-full-scan-offline.ts`, `scripts/run-offline-scan-with-direct.ts` |
| Scrape orkestrasyonu | `lib/scraper.ts` (runFullScrapeBatch) |
| A101 scrape | `lib/scraper/a101.ts` |
| Migros scrape | `lib/scraper/migros-api.ts`, `lib/scraper/migros.ts` (varsa) |
| Şok scrape | `lib/scraper/sok.ts` |
| DB toplu yazma + şüpheli (A101 nitelik) | `lib/db-utils.ts` (upsertProductBatch, A101_ZOMBIE_NITELIK) |
| Kategori keşfi | `lib/migros-category-discovery.ts`, `lib/a101-category-discovery.ts`, `lib/sok-category-discovery.ts` |
| Mapping senkronu | `lib/category-sync.ts` (syncMappingToNullProducts) |
| Alarm kontrolü (tarama sonrası) | `lib/alarm-engine.ts` |

---

## 3. Kategori ve eşleme

| Ne | Dosya(lar) |
|----|------------|
| Kategori ağacı API | `app/api/categories/route.ts`, `app/api/categories/tree/route.ts` |
| Sıralama (sidebar, alarm) | `lib/category-order.ts` |
| Ürün listesi filtre (ana kategori) | `app/api/products/route.ts`, `lib/category-mapper.ts` (ANA_KATEGORILER, SIDEBAR_TO_ANA) |
| Restore (CSV’den kategori/mapping) | `scripts/restore-category-mapping-from-csv.ts`, `lib/csv-parse.ts` |
| Parent’sız kategori listesi | `scripts/list-categories-missing-parent.ts` (isteğe bağlı) |

---

## 4. Ürün listesi ve detay

| Ne | Dosya(lar) |
|----|------------|
| Ana sayfa | `app/page.tsx` |
| Ürün API (arama, kategori, sıralama) | `app/api/products/route.ts` |
| Arama + kategori davranışı | `components/product-search.tsx` (searchOnlyInCategory, updateUrl) |
| Kategori sidebar (kategori tıklanınca q silinir) | `components/category-sidebar.tsx` |
| Ürün detay | `app/product/[id]/page.tsx` |
| Alternatifler API | `app/api/products/[id]/alternatives/route.ts` |
| A101 “Markette gör” URL | `lib/utils.ts` (getA101DisplayUrl) |
| Birim fiyat | `lib/unit-price.ts`, `lib/utils.ts` (parseQuantity) |

---

## 5. Alarm ve bildirim

| Ne | Dosya(lar) |
|----|------------|
| Alarm listesi | `app/alarms/page.tsx` |
| Yeni alarm (kategori + tekil ürün, onay, ayarlar) | `app/alarms/new/page.tsx` |
| Alarm düzenleme (sonuçlar / ayarlar) | `app/alarms/[id]/edit/page.tsx` |
| Alarm API | `app/api/alarms/route.ts`, `app/api/alarms/[id]/route.ts` |
| Alarm mantığı (birim fiyat, dahil/hariç; etiket kullanılmıyor) | `lib/alarm-engine.ts`, `lib/actions/smart-alarm.ts` |
| Bildirim API | `app/api/notifications/route.ts` |
| Bildirim UI (tıklanınca ürün / alarm sayfası) | `components/notification-center.tsx` |
| Alarm ürün kartı (birim fiyat) | `components/alarm-edit-product-card.tsx` |

---

## 6. Sepet ve takip

| Ne | Dosya(lar) |
|----|------------|
| Sepet context | `context/basket-context.tsx` |
| Sepet özeti / buton | `components/floating-basket-summary.tsx`, `components/add-to-basket-button.tsx` |
| Sepet sayfası | `app/basket/page.tsx` |
| Takip edilenler | `app/takip-edilen/page.tsx`, `app/api/follow/route.ts` |

---

## 7. Admin

| Ne | Dosya(lar) |
|----|------------|
| Admin giriş / koruma | `lib/admin-auth.ts` |
| Ana admin (bekleyen eşleşmeler) | `app/admin/page.tsx`, `app/api/admin/pending-category-mappings/route.ts` |
| Kategori mapping/manuel API | `app/api/admin/category-mapping/route.ts`, `app/api/admin/category-manuel/route.ts` |
| Şüpheli (sadece nitelikAdi’na göre) | `app/admin/suspicious/page.tsx`, `app/api/admin/suspicious/route.ts` |
| Kategori düzeltme | `app/admin/kategori-duzelt/page.tsx`, `app/api/admin/kategori-duzelt/route.ts` |
| Ürün-kategori API | `app/api/admin/product-category/route.ts` |
| Diğer admin API | `app/api/admin/login/route.ts`, `app/api/admin/logout/route.ts`, `app/api/admin/categories/route.ts`, `app/api/admin/pending-category-products/route.ts`, `app/api/admin/export-mappings/route.ts` |
| Debug (isteğe bağlı) | `app/admin/debug-uncategorized/page.tsx`, `app/api/admin/debug-uncategorized/route.ts`, `app/api/admin/debug-pending/route.ts` |

---

## 8. Ortak ve config

| Ne | Dosya(lar) |
|----|------------|
| Layout, nav | `app/layout.tsx`, `components/app-nav.tsx` |
| Prisma / DB | `lib/db.ts`, `prisma/schema.prisma` |
| Yıkıcı işlem koruması | `lib/destructive-guard.ts` |
| Oturum / kullanıcı | `lib/user-session.ts`, `lib/session-constants.ts` |
| Ürün resmi | `components/product-image.tsx` |
| Takip butonu | `components/follow-button.tsx` |
| Arama öneri API | `app/api/products/suggest/route.ts` |
| Tarama durumu | `app/api/tarama/status/route.ts`, `app/tarama/page.tsx` (isteğe bağlı) |
| Sepet karşılaştırma API | `app/api/basket/compare/route.ts` |
| Auth (login/logout) | `app/api/auth/login/route.ts`, `app/api/auth/logout/route.ts` (kullanılıyorsa), `app/login/page.tsx` |

---

## 9. Korunacak script’ler (sadece bunlar taşınsın)

- `scripts/run-full-scan-offline.ts`
- `scripts/run-offline-scan-with-direct.ts`
- `scripts/restore-category-mapping-from-csv.ts`
- `scripts/list-categories-missing-parent.ts`
- `scripts/check-unit-prices-from-db.ts` (read-only birim fiyat kontrolü)
- `scripts/test-unit-price-samples.ts` (örneklem birim fiyat testi)

Gerekirse: `scripts/import-only-mapping-manuel.ts`, `scripts/import-category-from-tsv.ts` (admin/ODS akışı kullanılıyorsa).

---

## 10. Kullanılmayan / taşınmayacak (silinebilir veya backup’ta kalsın)

- Eski seed/fetch script’leri: `seed-*.ts`, `fetch-*-kasar.ts`, `quick-seed.ts`, `reseed-all.ts`, `run-tatbikat-after-reset.ts`, `upload-a101-only.ts`, `clear-all-suspicious.ts`
- Eski tarama/scrape denemeleri: `run-standardized-scrape.ts`, `run-full-scan.ts`, `sok-tarama-from-ana-kategoriler.ts`, `scan-sok-dry-run.ts`, `sok-scraper-v2.ts`, `seed-sok-v2.ts`, `cleanup-sok-v2.ts`
- Tek seferlik / debug: `a101-full-scan-with-nitelik.ts`, `a101-nitelik-sample-5-per-group.ts`, `a101-full-flow-with-zombi-report.ts`, `experiment-tags.ts`, `fix-tags.ts`, `map-categories.ts`, `sync-mapping-to-null-products.ts` (logic lib/category-sync’te), tüm `debug-*.ts`, `diagnose-*.ts`, `analyze-*.ts`, `probe-*.ts`, `dump-*.ts`, `trace-*.ts`, `verify-*.ts`, `check-*.ts` (check-unit-prices-from-db ve check-unit-price testi hariç), `test-*.ts` (test-unit-price-samples hariç)
- Carrefour / diğer market: `lib/scraper/carrefour.ts`, `lib/adapters` içinde sadece A101 kullanılıyorsa diğer adapter’lar
- ODS/TSV/export: Gerek yoksa `import-category-from-tsv.ts`, `export-market-category-product-list.ts`, `write-ods-product-ids.ts`, `clean-and-import-ods` vb. kullanılmıyorsa taşınmasın

---

## 11. Kök dosyalar (taşınacak / sadeleştirilecek)

- `package.json` (sadece kullanılan bağımlılıklar; gerekli script’ler: dev, build, migrate, scan:offline vb.)
- `tsconfig.json`, `next.config.*`
- `prisma/schema.prisma` (mevcut modeller: User, Product, Price, Category, Market, MarketCategoryMapping, MarketCategoryManuel, SmartAlarm, Notification, UserFollowedProduct)
- `.env.example` (DATABASE_URL, DIRECT_URL, CONFIRM_DESTROY_PROD açıklaması)
- `prisma/seed-data/`: `Category_backup.csv`, `MarketCategoryMapping_backup.csv`, `MarketCategoryManuel_backup.csv`, `Market_rows.csv` (gerekirse)

---

## 12. OZET-BASIT ile çelişmemesi gerekenler

- Şüpheli: **Sadece** A101 nitelikAdi (GeçiciDelist, GrupSpot). Fiyat sapmasıyla şüpheli **yok**.
- Alarm: **Etiket filtresi yok**; kategori + tekil ürün; en güncel alarm akışı (new → onay → ayarlar; edit’te sonuçlar/ayarlar).
- Arama: Kategori tıklanınca arama temizlenir; arama yapılınca kategori temizlenir; “Sadece bu kategoride ara” açıkken kategori korunur. Kelime sırası olmadan arama (contains) var.
- Ürün: Her market kaydı ayrı kart; tek sayfada “hangi markette ne kadar” listesi yok.
- Tarama: A101’de nitelikAdi her üründe alınır; sadece GeçiciDelist/GrupSpot şüpheli; şüpheliler izlenir (fiyat/nitelik değişince çıkar), kullanıcıya gösterilmez.

Bu rehber + OZET-BASIT ile sıfır/taşıma işlemlerine başlanabilir; teknik değişiklikler bu kurallara muhalif olmamalı.
