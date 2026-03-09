# Market Karşılaştırma — Proje Yol Haritası

> Bu dosya değişmez büyük resmi saklar. Operasyonel detaylar için `task.md` ve kural için `CORE_RULES.md`'ye bakılır.

---

## Vizyon

Kullanıcının **ürün/marka takip eden** değil, **ihtiyaç bazlı alarm kuran** bir araç.
Detay: `CORE_RULES.md`

---

## Fazlar

### ✅ Faz 0 — Altyapı (Tamamlandı)
Supabase, Vercel, Cron, PWA, Beta Wall, Prisma şeması.

### 🔴 Faz 1 — Tarama & Kategorilendirme Motoru (Şu an)
Her üç marketten ürünler **ana + yaprak (canonical) + tag** ile sisteme girmeli. Kategori modeli: **docs/KATEGORIZASYON-MODELI.md**.
Başarı kriteri: Kullanıcı "Salça" seçince sadece salçalar gelir, "salçalı cips" gelmez.

### 🟡 Faz 2 — Kullanıcı Sistemi
Username + PIN kaydı. Alarm ve listeler kişiye özel.

### 🟠 Faz 3 — UI/UX Rafine
Skeleton loader, animasyonlar, dark mode.

### 🔵 Faz 4 — Admin Paneli
Bot izleme, manuel tarama tetikleme, alarm logları.

### ⚪ Faz 5 — Bildirimler (Opsiyonel)
Web Push ve e-posta.

---

## Deployment Kuralı
**Önce localhost'ta test et, her şey sağlamsa deploy et.** Her faz sonu deploy yapılır.
