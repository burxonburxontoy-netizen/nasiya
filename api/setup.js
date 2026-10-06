// Bir martalik sozlash: https://SAYT/api/setup
// Webhook, buyruqlar, bot tavsifi va Menu tugmasini o'rnatadi (faqat shu saytga yo'naltiradi).
import { tg, siteUrl, webhookSecret } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const site = siteUrl(req);
    const out = {};
    out.webhook = await tg("setWebhook", {
      url: `${site}/api/bot`, secret_token: webhookSecret(),
      allowed_updates: ["message"], drop_pending_updates: true,
    });
    out.commands = await tg("setMyCommands", {
      commands: [
        { command: "start", description: "Boshlash" },
        { command: "qarz", description: "Mening qarzlarim" },
      ],
    });
    out.description = await tg("setMyDescription", {
      description: "Nasiya — raqamli nasiya daftari. Do'konlardagi qarzingizni kuzating, eslatma oling va tasdiqlang.",
    });
    out.short = await tg("setMyShortDescription", { short_description: "Raqamli nasiya daftari 📒" });
    out.menu = await tg("setChatMenuButton", {
      menu_button: { type: "web_app", text: "Nasiya", web_app: { url: site } },
    });
    const me = await tg("getMe", {});
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(`<body style="font-family:system-ui;padding:40px;background:#F3EEE3">
      <h1>✅ Bot sozlandi</h1><p>Bot: <b>@${me.username}</b></p><p>Webhook: ${site}/api/bot</p>
      <p><a href="https://t.me/${me.username}">Botni ochish →</a></p></body>`);
  } catch (e) {
    res.status(500).send("Xato: " + e.message);
  }
}
