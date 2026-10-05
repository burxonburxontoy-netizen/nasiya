// Telegram webhook: https://SAYT/api/bot
import { tg, sb, money, esc, miniAppUrl, siteUrl, env } from "./_lib.js";

const MENU = { keyboard: [[{ text: "💰 Qarzim" }, { text: "ℹ️ Yordam" }]], resize_keyboard: true };

async function sendDebts(req, chatId) {
  const list = await sb("rpc/tg_my_debts", { method: "POST", body: { p_chat_id: chatId } });
  if (!list.length) {
    return tg("sendMessage", {
      chat_id: chatId, parse_mode: "HTML", reply_markup: MENU,
      text: "Siz hali birorta do'konga ulanmagansiz.\n\nDo'kondor yuborgan <b>maxsus link</b> orqali botga kiring — shunda qarzingizni shu yerda ko'rasiz.",
    });
  }
  const total = list.reduce((a, x) => a + Math.max(0, Number(x.balance)), 0);
  const lines = list.map((x) => `🏪 <b>${esc(x.shop_name)}</b> — ${Number(x.balance) > 0 ? money(x.balance) : "qarz yo'q ✅"}`);
  return tg("sendMessage", {
    chat_id: chatId, parse_mode: "HTML",
    text: `<b>Sizning nasiyalaringiz</b>\n\n${lines.join("\n")}\n\nJami: <b>${money(total)}</b>`,
    reply_markup: {
      inline_keyboard: list.map((x) => [{ text: `📒 ${x.shop_name} — batafsil`, web_app: { url: miniAppUrl(req, x.token) } }]),
    },
  });
}

async function handleStart(req, chatId, payload, firstName) {
  if (payload) {
    const c = await sb("rpc/tg_link", { method: "POST", body: { p_token: payload, p_chat_id: chatId } });
    if (c) {
      const bal = Number(c.balance);
      await tg("sendMessage", {
        chat_id: chatId, parse_mode: "HTML", reply_markup: MENU,
        text: `✅ <b>${esc(c.shop_name)}</b> do'koniga ulandingiz!\n\nEndi yangi nasiya yoki to'lov bo'lsa, shu yerga xabar keladi.`,
      });
      return tg("sendMessage", {
        chat_id: chatId, parse_mode: "HTML",
        text: bal > 0 ? `Joriy qarzingiz: <b>${money(bal)}</b>` : "Sizda qarz yo'q 🎉",
        reply_markup: { inline_keyboard: [[{ text: "📒 Tarixni ochish", web_app: { url: miniAppUrl(req, payload) } }]] },
      });
    }
  }
  return tg("sendMessage", {
    chat_id: chatId, parse_mode: "HTML", reply_markup: MENU,
    text: `Assalomu alaykum, ${esc(firstName || "")}! 👋\n\n<b>Nasiya</b> — raqamli nasiya daftari.\n\n` +
      `👤 <b>Mijoz bo'lsangiz:</b> do'kondor yuborgan link orqali kiring va qarzingizni kuzating.\n` +
      `🏪 <b>Do'kondor bo'lsangiz:</b> saytda bepul ro'yxatdan o'ting.`,
  }).then(() => tg("sendMessage", {
    chat_id: chatId, text: "Do'kondorlar uchun:",
    reply_markup: { inline_keyboard: [[{ text: "🌐 Saytni ochish", url: siteUrl(req) }]] },
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Nasiya bot ishlayapti ✅");
  if (req.headers["x-telegram-bot-api-secret-token"] !== env("WEBHOOK_SECRET")) return res.status(401).end();

  const msg = req.body?.message;
  try {
    if (msg?.text) {
      const chatId = msg.chat.id;
      const text = msg.text.trim();
      if (text.startsWith("/start")) await handleStart(req, chatId, text.split(/\s+/)[1], msg.from?.first_name);
      else if (text === "💰 Qarzim" || text === "/qarz") await sendDebts(req, chatId);
      else await tg("sendMessage", {
        chat_id: chatId, parse_mode: "HTML", reply_markup: MENU,
        text: "ℹ️ <b>Yordam</b>\n\n💰 <b>Qarzim</b> — barcha do'konlardagi qarzingiz\n📒 Tugma orqali to'liq tarixni ko'rasiz va tasdiqlaysiz\n\nSavol bo'lsa — do'konga murojaat qiling.",
      });
    }
  } catch (e) {
    console.error(e);
  }
  // Telegram qayta yubormasligi uchun har doim 200
  res.status(200).json({ ok: true });
}
