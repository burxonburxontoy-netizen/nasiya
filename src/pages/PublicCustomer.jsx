import { useEffect, useState } from "react";
import { Icon, Logo, Spinner, Empty, Button } from "../components/ui.jsx";
import { publicCustomer, confirmPublic, botLink } from "../lib/api.js";
import { money, date, useCountUp } from "../lib/util.js";

const TG = typeof window !== "undefined" ? window.Telegram?.WebApp : null;
const inTelegram = () => !!(TG && TG.initData) || /[?&]tg=1/.test(location.hash);

export default function PublicCustomer({ token }) {
  const [d, setD] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const tgMode = inTelegram();
  const load = () => publicCustomer(token).then(setD).catch(() => setD(null));

  useEffect(() => {
    load();
    if (TG && TG.initData) {
      TG.ready(); TG.expand();
      try { TG.setHeaderColor("#16130F"); TG.setBackgroundColor("#16130F"); } catch {}
    }
  }, [token]);

  const unconfirmed = d ? d.transactions.filter((t) => !t.confirmed_at).length : 0;

  async function confirm() {
    setBusy(true);
    try {
      await confirmPublic(token);
      try { TG?.HapticFeedback?.notificationOccurred("success"); } catch {}
      setDone(true);
      await load();
    } catch { try { TG?.showAlert?.("Xatolik. Qayta urinib ko'ring."); } catch {} }
    setBusy(false);
  }

  // Telegram ichida asosiy pastki tugma
  useEffect(() => {
    if (!(TG && TG.initData) || !d) return;
    const mb = TG.MainButton;
    if (unconfirmed > 0) {
      mb.setParams({ text: `✓ ${unconfirmed} ta yozuvni tasdiqlash`, color: "#C8F03C", text_color: "#16130F" });
      mb.show();
      mb.onClick(confirm);
      return () => mb.offClick(confirm);
    }
    mb.hide();
  }, [d, unconfirmed]);

  const bal = useCountUp(Math.max(0, d?.balance || 0), d !== undefined, 1300);

  if (d === undefined) return <div className="center-page"><Spinner size={32} /></div>;
  if (!d) return <div className="center-page"><Empty icon="link" title="Sahifa topilmadi" text="Link noto'g'ri yoki eskirgan bo'lishi mumkin." /></div>;

  const clear = d.balance <= 0;
  const bot = botLink(token);
  const showWebConfirm = unconfirmed > 0 && !(TG && TG.initData);

  return (
    <div className={`pub ${tgMode ? "pub--tg" : ""}`}>
      <div className="pub__card">
        <div className="pub__head">
          <Logo size={26} />
          <span className="tag">{d.shop_name}</span>
        </div>
        <p className="pub__hi">Assalomu alaykum, <b>{d.name}</b></p>
        <div className={`pub__bal ${clear ? "is-clear" : ""}`}>
          <small>{clear ? "Sizda qarz yo'q" : "Sizning joriy qarzingiz"}</small>
          <b>{money(bal, false)}<span> so'm</span></b>
          {clear && <span className="pub__ok"><Icon name="check" size={16} stroke={3} /> Hammasi to'langan. Rahmat!</span>}
          {done && !clear && <span className="pub__ok"><Icon name="check" size={16} stroke={3} /> Tasdiqlandi. Rahmat!</span>}
        </div>

        {!tgMode && bot && !d.telegram && (
          <a className="pub__tglink" href={bot} target="_blank" rel="noreferrer"><Icon name="tg" size={18} /> Telegram'da kuzatish va eslatma olish</a>
        )}

        {(d.shop_phone || d.shop_address) && (
          <div className="pub__shop">
            {d.shop_phone && <a href={`tel:${d.shop_phone.replace(/\s/g, "")}`}><Icon name="phone" size={16} /> {d.shop_phone}</a>}
            {d.shop_address && <span><Icon name="store" size={16} /> {d.shop_address}</span>}
          </div>
        )}
        <h3 className="pub__h">Tarix</h3>
        <div className="pub__list">
          {d.transactions.map((t, i) => (
            <div key={i} className="pub__row" style={{ animationDelay: `${i * 50}ms` }}>
              <span className={`feed__ic feed__ic--${t.type}`}><Icon name={t.type === "debt" ? "plus" : "check"} size={14} stroke={2.6} /></span>
              <span className="pub__txt">
                <b>{t.note || (t.type === "debt" ? "Nasiya" : "To'lov")}</b>
                <small>{date(t.created_at, true)}{t.due_date && t.type === "debt" ? ` · muddat ${date(t.due_date)}` : ""}</small>
                {t.confirmed_at ? <span className="pub__state">✓ tasdiqlangan</span> : <span className="pub__state pub__state--wait">● tasdiq kutilmoqda</span>}
              </span>
              <span className={`amt amt--${t.type}`}>{t.type === "debt" ? "+" : "−"}{money(t.amount, false)}</span>
            </div>
          ))}
          {!d.transactions.length && <p className="muted">Hali yozuvlar yo'q.</p>}
        </div>

        {showWebConfirm && (
          <div className="pub__confirm">
            <Button variant="lime" size="lg" icon="check" loading={busy} onClick={confirm}>{unconfirmed} ta yozuvni tasdiqlayman</Button>
            <small>Tasdiqlash — yozuvlar to'g'ri ekanini bildiradi</small>
          </div>
        )}
        <p className="pub__foot">Bu sahifa faqat siz uchun. Savol bo'lsa, do'konga murojaat qiling.</p>
      </div>
    </div>
  );
}
