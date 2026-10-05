// Server tomondagi umumiy yordamchilar (Vercel Functions)
// Kerakli Environment Variables (Vercel → Project → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN          — @BotFather bergan token
//   SUPABASE_URL                — https://xxxx.supabase.co
//   SUPABASE_ANON_KEY           — anon public key
//   SUPABASE_SERVICE_ROLE_KEY   — service_role key (MAXFIY, faqat shu yerda)
//   WEBHOOK_SECRET              — o'zingiz o'ylab topgan istalgan uzun so'z
//   SITE_URL (ixtiyoriy)        — https://nasiya.vercel.app

export const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Environment variable yo'q: ${k}`);
  return v;
};

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}`;
}

export const money = (n) =>
  Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";

export async function tg(method, payload) {
  const r = await fetch(`https://api.telegram.org/bot${env("TELEGRAM_BOT_TOKEN")}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!data.ok) throw new Error(`Telegram: ${data.description || r.status}`);
  return data.result;
}

/** Supabase REST. as: "service" | "anon" | {token} (foydalanuvchi nomidan, RLS bilan) */
export async function sb(path, { method = "GET", body, as = "service" } = {}) {
  const key = as === "service" ? env("SUPABASE_SERVICE_ROLE_KEY") : env("SUPABASE_ANON_KEY");
  const bearer = typeof as === "object" ? as.token : key;
  const r = await fetch(`${env("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error((data && data.message) || `Supabase ${r.status}`);
  return data;
}

export const esc = (s = "") => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

export const miniAppUrl = (req, token) => `${siteUrl(req)}/#/c/${token}?tg=1`;
