# Supabase bağlantı (DATABASE_URL)

## Connect penceresi nerede?

**Settings sayfasında değil.** Sol menüdeki dişli (Settings) → General/Compute/API Keys orası; orada connection string yok.

Connection string şu pencerede: **Proje ana sayfasının üstündeki "Connect" butonu** ile açılan modal.  
Bunu doğrudan açmak için tarayıcıda şu adresi kullan (kendi proje ID’n zaten var):

**https://supabase.com/dashboard/project/bqvthqqnxfuzhgcqiwnh?showConnect=true**

- Session pooler URI’yi aynı pencerede **Method** menüsünden **“Session pooler”** seçince görürsün.  
- Session pooler’ı doğrudan açmak için:  
  **https://supabase.com/dashboard/project/bqvthqqnxfuzhgcqiwnh?showConnect=true&method=session**

## .env’de ne olmalı?

- **Direct:** `postgresql://postgres:[ŞİFRE]@db.bqvthqqnxfuzhgcqiwnh.supabase.co:5432/postgres`
- **Session pooler:** `postgresql://postgres.bqvthqqnxfuzhgcqiwnh:[ŞİFRE]@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?pgbouncer=true`

Şifreyi Supabase’te **Database Settings** (Settings değil; sol tarafta **Database** bölümü → **Database** altında **Settings**) üzerinden sıfırlayıp kopyalayabilirsin.

## “Authentication failed” alırsan

1. Connect penceresini yukarıdaki linkle aç; Method = Session pooler seçili olsun; URI’deki `[YOUR-PASSWORD]` yerine **yeni şifreyi** yapıştır (başta/sonda boşluk olmasın).
2. Supabase sol menüde **Database** (dişli değil, veritabanı ikonu) → **Settings** → “Network restrictions” / “Restrict database access” varsa, test için tüm IP’lere izin ver veya kendi IP’ni ekle.
3. Prisma için pooler kullanırken connection string’in sonuna `?pgbouncer=true` ekli olsun (zaten eklendi).
