# Nasiya — raqamli nasiya daftari

Mahalla do'konlari uchun SaaS: do'kondor mijozlarning qarzini yozib boradi, Telegram/SMS orqali eslatma yuboradi, mijoz esa o'z qarzini shaxsiy linkda ko'radi.

**Stack:** React 19 · esbuild · Supabase (Auth + Postgres + RLS) · qo'lda yozilgan CSS animatsiyalar · Vercel

## Imkoniyatlar

- **Landing** — scroll'ga bog'langan "daftar → telefon" animatsiyasi, bento kartalar, narxlar, FAQ
- **Auth** — ro'yxatdan o'tish / kirish (Supabase Auth), do'kon avtomatik yaratiladi
- **Do'kondor paneli** — KPI'lar, 6 oylik grafik, qaytish darajasi, top qarzdorlar, muddati o'tganlar
- **Mijozlar** — qidiruv, filtr, saralash, nasiya limiti, tarix (qoldiq bilan), CSV eksport
- **Eslatma** — Telegram / SMS / nusxa, tayyor matn + shaxsiy link
- **Mijoz sahifasi** — `/#/c/<token>`: mijoz o'z qarzi va tarixini ko'radi (login'siz)
- **Admin panel** — barcha do'konlar, MRR, aylanma, tariflarni o'zgartirish, do'konni bloklash
- **Demo rejim** — Supabase ulanmasa ham to'liq ishlaydi (ma'lumotlar brauzerda)

## Ishga tushirish

### 1. Supabase
1. supabase.com → New project
2. **SQL Editor** → `supabase/schema.sql` faylini to'liq joylashtiring → **Run**
3. **Authentication → Sign In / Providers → Email** → "Confirm email" ni **o'chiring** (test uchun qulay)
4. **Project Settings → API** → `Project URL` va `anon public` key'ni oling
5. `public/config.js` fayliga yozing

### 2. Admin bo'lish
Saytda ro'yxatdan o'ting, keyin SQL Editor'da:
```sql
update public.shops set is_admin = true
where id = (select id from auth.users where email = 'sizning@email.com');
```

### 3. Lokal
```bash
npm install
npm run build      # dist/ papka tayyor bo'ladi
npx serve dist
```

### 4. Vercel
GitHub'ga yuklang → vercel.com → **Add New Project** → repo'ni tanlang → **Deploy**.
`vercel.json` build sozlamalarini o'zi beradi.

## Tuzilma
```
src/
  main.jsx              router va auth holati
  lib/supa.js           Supabase klienti (fetch asosida)
  lib/local.js          demo backend (bir xil interfeys)
  lib/api.js            biznes-logika: balanslar, statistika
  pages/Landing.jsx     bosh sahifa va animatsiyalar
  pages/Dashboard.jsx   do'kondor paneli
  pages/Admin.jsx       admin panel
  pages/PublicCustomer.jsx  mijoz sahifasi
supabase/schema.sql     jadvallar, RLS, triggerlar, RPC
```

## Telegram bot + Mini App

**Qanday ishlaydi:** do'kondor eslatma yuborganda xabarda `t.me/BOT?start=<token>` link bo'ladi. Mijoz bossa — bot uni do'konga ulaydi. Shundan keyin har bir yangi nasiya/to'lov haqida avtomatik xabar boradi, "📒 Batafsil" tugmasi Mini App'ni ochadi — u yerda tarix va **tasdiqlash** tugmasi.

| Fayl | Vazifa |
|---|---|
| `api/bot.js` | Telegram webhook: `/start <token>`, "💰 Qarzim", yordam |
| `api/notify.js` | Paneldan mijozga xabar (foydalanuvchi tokeni + RLS bilan tekshiriladi) |
| `api/setup.js` | Bir martalik: webhook, buyruqlar, Menu tugmasi |
| `supabase/schema_bot.sql` | `telegram_chat_id`, `confirmed_at`, RPC'lar |

**Sozlash:**
1. @BotFather → `/newbot` → token oling
2. `public/config.js` → `telegramBot: "bot_username"`
3. Supabase SQL Editor'da `supabase/schema_bot.sql` ni Run qiling
4. Vercel → Settings → Environment Variables:
   `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET`
5. Redeploy → brauzerda oching: `https://SAYT/api/setup?key=WEBHOOK_SECRET`
6. @BotFather → `/mybots` → Bot Settings → Configure Mini App → URL: `https://SAYT`

## Keyingi bosqich
- Click / Payme orqali tarif to'lovi
