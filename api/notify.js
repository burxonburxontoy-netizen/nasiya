// Do'kondor paneldan mijozga bot orqali xabar yuborish.
// POST /api/notify  { customer_id, kind: "reminder" | "tx", text? }
// Header: Authorization: Bearer <foydalanuvchi access_token>
import { tg, sb, money, esc, miniAppUrl } from "./_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const { customer_id, kind = "reminder", text } = req.body || {};
  if (!token || !customer_id) return res.status(400).json({ error: "customer_id va token kerak" });

  try {
    // Foydalanuvchi nomidan o'qiymiz — RLS faqat o'z mijozini ko'rsatadi
    const as = { token };
    const [c] = await sb(`customers?id=eq.${encodeURIComponent(customer_id)}&select=name,telegram_chat_id,public_token,shop_id`, { as });
    if (!c) return res.status(404).json({ error: "Mijoz topilmadi" });
    if (!c.telegram_chat_id) return res.status(409).json({ error: "Mijoz hali botga ulanmagan" });
    const [shop] = await sb(`shops?id=eq.${c.shop_id}&select=name`, { as });
    const txs = await sb(`transactions?customer_id=eq.${encodeURIComponent(customer_id)}&select=type,amount,note,created_at&order=created_at.desc`, { as });
    const balance = txs.reduce((a, t) => a + (t.type === "debt" ? +t.amount : -t.amount), 0);
    const last = txs[0];

    let body;
    if (kind === "tx" && last) {
      body = last.type === "debt"
        ? `🧾 <b>${esc(shop?.name)}</b>: yangi nasiya\n\n➕ ${money(last.amount)}${last.note ? ` — ${esc(last.note)}` : ""}\n\nJoriy qarz: <b>${money(balance)}</b>`
        : `✅ <b>${esc(shop?.name)}</b>: to'lov qabul qilindi\n\n➖ ${money(last.amount)}\n\nQolgan qarz: <b>${money(Math.max(0, balance))}</b>${balance <= 0 ? " 🎉" : ""}`;
    } else {
      body = text ? esc(text) : `🔔 <b>${esc(shop?.name)}</b> eslatmasi\n\nAssalomu alaykum, ${esc(c.name)}! Joriy nasiyangiz: <b>${money(balance)}</b>.`;
    }

    await tg("sendMessage", {
      chat_id: c.telegram_chat_id, parse_mode: "HTML", text: body,
      reply_markup: { inline_keyboard: [[{ text: "📒 Batafsil / tasdiqlash", web_app: { url: miniAppUrl(req, c.public_token) } }]] },
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
