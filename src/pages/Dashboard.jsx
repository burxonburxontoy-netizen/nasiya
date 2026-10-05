import { useEffect, useMemo, useState, useCallback } from "react";
import { Icon, Logo, Avatar, Button, Field, Modal, Empty, Spinner, useToast } from "../components/ui.jsx";
import { LineChart, Bars, Donut } from "../components/Charts.jsx";
import * as api from "../lib/api.js";
import { go, money, date, ago, parseAmount, formatInput, PLANS, MONTHS_FULL, useCountUp } from "../lib/util.js";

export const publicLink = (token) => `${location.origin}${location.pathname}#/c/${token}`;
export function reminderText(c, shop) {
  const bot = api.botLink(c.public_token);
  return `Assalomu alaykum, ${c.name}! "${shop?.name || "Do'kon"}" do'konidagi nasiyangiz: ${money(c.balance)}. Batafsil ko'rish: ${publicLink(c.public_token)}` +
    (bot && !c.telegram_chat_id ? `\nTelegram'da kuzatish: ${bot}` : "");
}

// ================= LAYOUT =================
export default function Dashboard({ path, shop, reloadShop }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [txModal, setTxModal] = useState(null); // {customer?, type}
  const [custModal, setCustModal] = useState(null);
  const [menu, setMenu] = useState(false);

  const reload = useCallback(async () => {
    try { setData(await api.loadShopData()); } catch (e) { toast(e.message, "err"); }
  }, []);
  useEffect(() => { reload(); }, []);
  useEffect(() => setMenu(false), [path]);

  const parts = path.split("/").filter(Boolean); // ["app", "customers", id]
  const section = parts[1] || "home";
  const nav = [
    { k: "home", to: "/app", icon: "home", t: "Bosh sahifa" },
    { k: "customers", to: "/app/customers", icon: "users", t: "Mijozlar" },
    { k: "settings", to: "/app/settings", icon: "settings", t: "Sozlamalar" },
  ];
  const plan = PLANS[shop?.plan || "free"];
  const limitReached = data && data.customers.length >= plan.limit;

  const ctx = { data, reload, shop, reloadShop, openTx: (o) => setTxModal(o), openCustomer: (c) => {
    if (!c && limitReached) return toast(`${plan.name} tarifida ${plan.limit} tagacha mijoz. Tarifni oshiring.`, "err");
    setCustModal(c || {});
  } };

  return (
    <div className={`app ${menu ? "app--menu" : ""}`}>
      <aside className="side">
        <div className="side__top">
          <a href="#/" className="side__logo"><Logo light /></a>
          <button className="icon-btn side__close" onClick={() => setMenu(false)}><Icon name="x" /></button>
        </div>
        <div className="side__shop">
          <Avatar name={shop?.name} size={40} />
          <div><b>{shop?.name}</b><small>{plan.name} tarif{api.isDemo() ? " · demo" : ""}</small></div>
        </div>
        <nav className="side__nav">
          {nav.map((n) => (
            <a key={n.k} href={`#${n.to}`} className={section === n.k ? "is-active" : ""}>
              <Icon name={n.icon} size={19} />{n.t}
              {n.k === "customers" && data && <em>{data.customers.length}</em>}
            </a>
          ))}
          {shop?.is_admin && <a href="#/admin"><Icon name="shield" size={19} />Admin panel</a>}
        </nav>
        <div className="side__plan">
          <small>Mijozlar limiti</small>
          <div className="meter"><i style={{ width: `${Math.min(100, ((data?.customers.length || 0) / (plan.limit === Infinity ? 1e9 : plan.limit)) * 100)}%` }} /></div>
          <span>{data?.customers.length || 0} / {plan.limit === Infinity ? "∞" : plan.limit}</span>
        </div>
        <button className="side__logout" onClick={async () => { await api.signOut(); go("/"); }}>
          <Icon name="logout" size={18} /> Chiqish
        </button>
      </aside>
      <div className="side__scrim" onClick={() => setMenu(false)} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn topbar__burger" onClick={() => setMenu(true)}><Icon name="menu" /></button>
          <div className="topbar__title">
            {section === "home" && <><small>{greeting()}</small><h1>{shop?.owner_name || shop?.name}</h1></>}
            {section === "customers" && !parts[2] && <h1>Mijozlar</h1>}
            {section === "customers" && parts[2] && <a href="#/app/customers" className="back"><Icon name="arrowLeft" size={18} /> Mijozlar</a>}
            {section === "settings" && <h1>Sozlamalar</h1>}
          </div>
          <div className="topbar__actions">
            <Button variant="outline" icon="plus" className="hide-sm" onClick={() => ctx.openCustomer()}>Mijoz</Button>
            <Button icon="plus" onClick={() => setTxModal({ type: "debt" })}>Nasiya yozish</Button>
          </div>
        </header>

        {api.isDemo() && (
          <div className="demo-banner">
            <Icon name="zap" size={16} /> Demo rejim — o'zgarishlar faqat shu brauzerda saqlanadi.
            <a href="#/register">O'z do'koningizni oching →</a>
          </div>
        )}

        <div className="page" key={path}>
          {!data ? <div className="loading"><Spinner size={32} /></div> :
            section === "home" ? <Overview {...ctx} /> :
            section === "customers" && parts[2] ? <CustomerDetail id={parts[2]} {...ctx} /> :
            section === "customers" ? <Customers {...ctx} /> :
            section === "settings" ? <Settings {...ctx} /> : null}
        </div>
      </main>

      <TxModal state={txModal} onClose={() => setTxModal(null)} customers={data?.customers || []}
        onDone={async () => { setTxModal(null); await reload(); }} />
      <CustomerModal state={custModal} onClose={() => setCustModal(null)}
        onDone={async (c, isNew) => { setCustModal(null); await reload(); if (isNew) go(`/app/customers/${c.id}`); }} />
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Xayrli tun," : h < 11 ? "Xayrli tong," : h < 18 ? "Xayrli kun," : "Xayrli kech,";
}

// ================= OVERVIEW =================
function Kpi({ label, value, icon, tone, sub, delay = 0, isMoney = true }) {
  const v = useCountUp(value, true, 1100);
  return (
    <div className={`kpi kpi--${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi__top"><span>{label}</span><i><Icon name={icon} size={18} /></i></div>
      <b>{isMoney ? money(v, false) : Math.round(v)}{isMoney && <small> so'm</small>}</b>
      {sub && <span className="kpi__sub">{sub}</span>}
    </div>
  );
}

function monthly(transactions, n = 6) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS_FULL[d.getMonth()].slice(0, 3).replace("Iyu", d.getMonth() === 5 ? "Iyn" : "Iyl"), debt: 0, payment: 0 });
  }
  for (const t of transactions) {
    const d = new Date(t.created_at);
    const b = out.find((o) => o.y === d.getFullYear() && o.m === d.getMonth());
    if (b) b[t.type] += +t.amount;
  }
  return out;
}

function Overview({ data, openCustomer }) {
  const { customers, transactions } = data;
  const total = customers.reduce((a, c) => a + Math.max(0, c.balance), 0);
  const debtors = customers.filter((c) => c.balance > 0);
  const overdue = customers.filter((c) => c.overdue);
  const months = useMemo(() => monthly(transactions), [transactions]);
  const cur = months[months.length - 1];
  const prev = months[months.length - 2];
  const pct = prev?.payment ? Math.round(((cur.payment - prev.payment) / prev.payment) * 100) : null;
  const top = [...debtors].sort((a, b) => b.balance - a.balance).slice(0, 6);
  const recent = transactions.slice(0, 7);
  const byId = Object.fromEntries(customers.map((c) => [c.id, c]));
  const allDebt = transactions.filter((t) => t.type === "debt").reduce((a, t) => a + +t.amount, 0);
  const allPaid = transactions.filter((t) => t.type === "payment").reduce((a, t) => a + +t.amount, 0);
  const rate = allDebt ? Math.round((allPaid / allDebt) * 100) : 0;

  if (!customers.length) {
    return <Empty icon="users" title="Hali mijozlar yo'q" text="Birinchi mijozingizni qo'shing va nasiyani yozishni boshlang."
      action={<Button icon="plus" onClick={() => openCustomer()}>Birinchi mijozni qo'shish</Button>} />;
  }

  return (
    <div className="stack-lg">
      <div className="kpis">
        <Kpi label="Umumiy nasiya" value={total} icon="wallet" tone="ink" sub={`${debtors.length} ta qarzdor mijoz`} />
        <Kpi label="Shu oy berildi" value={cur.debt} icon="arrowUpRight" tone="red" delay={80} sub={`${MONTHS_FULL[cur.m]}`} />
        <Kpi label="Shu oy qaytdi" value={cur.payment} icon="check" tone="green" delay={160}
          sub={pct == null ? "o'tgan oy bilan solishtirib bo'lmaydi" : `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% o'tgan oyga nisbatan`} />
        <Kpi label="Muddati o'tgan" value={overdue.length} icon="alert" tone="lime" delay={240} isMoney={false} sub="mijozga eslatma kerak" />
      </div>

      <div className="grid-main">
        <section className="card">
          <div className="card__head"><h3>Oxirgi 6 oy</h3><span className="muted">Berilgan va qaytgan nasiya</span></div>
          <LineChart data={months} series={[
            { key: "debt", label: "Berildi", color: "#FF5B37" },
            { key: "payment", label: "Qaytdi", color: "#15A365" },
          ]} />
        </section>
        <section className="card card--center">
          <div className="card__head"><h3>Qaytish darajasi</h3></div>
          <Donut label={`${rate}%`} sub="qaytarilgan" parts={[
            { value: allPaid, color: "#15A365" }, { value: Math.max(0, allDebt - allPaid), color: "#FF5B37" },
          ]} />
          <div className="legend-rows">
            <div><i style={{ background: "#15A365" }} />Qaytdi <b>{money(allPaid)}</b></div>
            <div><i style={{ background: "#FF5B37" }} />Qolgan <b>{money(Math.max(0, allDebt - allPaid))}</b></div>
          </div>
        </section>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card__head"><h3>Eng katta qarzdorlar</h3><a href="#/app/customers" className="link">Hammasi</a></div>
          {top.length ? <Bars items={top.map((c) => ({ label: c.name, value: c.balance, color: c.overdue ? "#FF5B37" : "var(--ink)" }))} />
            : <p className="muted">Qarzdorlar yo'q 🎉</p>}
        </section>
        <section className="card">
          <div className="card__head"><h3>So'nggi harakatlar</h3></div>
          <div className="feed">
            {recent.map((t) => (
              <a key={t.id} className="feed__row" href={`#/app/customers/${t.customer_id}`}>
                <span className={`feed__ic feed__ic--${t.type}`}><Icon name={t.type === "debt" ? "plus" : "check"} size={15} stroke={2.6} /></span>
                <span className="feed__txt"><b>{byId[t.customer_id]?.name || "Mijoz"}</b><small>{t.note || (t.type === "debt" ? "Nasiya" : "To'lov")} · {ago(t.created_at)}</small></span>
                <span className={`amt amt--${t.type}`}>{t.type === "debt" ? "+" : "−"}{money(t.amount, false)}</span>
              </a>
            ))}
          </div>
        </section>
      </div>

      {overdue.length > 0 && (
        <section className="card card--alert">
          <div className="card__head"><h3><Icon name="alert" size={18} /> Muddati o'tganlar</h3></div>
          <div className="chips">
            {overdue.map((c) => (
              <a key={c.id} href={`#/app/customers/${c.id}`} className="chip"><Avatar name={c.name} size={26} />{c.name}<b>{money(c.balance, false)}</b></a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ================= CUSTOMERS =================
function Customers({ data, openCustomer }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sort, setSort] = useState("recent");
  const tabs = [
    ["all", "Hammasi", data.customers.length],
    ["debt", "Qarzdorlar", data.customers.filter((c) => c.balance > 0).length],
    ["overdue", "Muddati o'tgan", data.customers.filter((c) => c.overdue).length],
    ["clear", "Yopilgan", data.customers.filter((c) => c.balance <= 0).length],
  ];
  const list = useMemo(() => {
    let l = data.customers.filter((c) =>
      (c.name + " " + (c.phone || "")).toLowerCase().includes(q.toLowerCase()) &&
      (tab === "all" || (tab === "debt" && c.balance > 0) || (tab === "overdue" && c.overdue) || (tab === "clear" && c.balance <= 0)));
    const s = { recent: (a, b) => b.lastActivity.localeCompare(a.lastActivity), big: (a, b) => b.balance - a.balance, name: (a, b) => a.name.localeCompare(b.name) };
    return l.sort(s[sort]);
  }, [data, q, tab, sort]);

  return (
    <div className="stack-lg">
      <div className="toolbar">
        <div className="search"><Icon name="search" size={18} /><input placeholder="Ism yoki telefon bo'yicha qidirish…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="input select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Oxirgi faollik</option>
          <option value="big">Eng katta qarz</option>
          <option value="name">Ism (A–Z)</option>
        </select>
        <Button icon="plus" onClick={() => openCustomer()}>Yangi mijoz</Button>
      </div>
      <div className="tabs">
        {tabs.map(([k, t, n]) => <button key={k} className={tab === k ? "is-on" : ""} onClick={() => setTab(k)}>{t}<em>{n}</em></button>)}
      </div>
      {!list.length ? (
        <Empty icon="users" title={data.customers.length ? "Hech narsa topilmadi" : "Hali mijozlar yo'q"}
          text={data.customers.length ? "Qidiruv yoki filtrni o'zgartirib ko'ring." : "Birinchi mijozni qo'shing — bu 10 soniya."}
          action={!data.customers.length && <Button icon="plus" onClick={() => openCustomer()}>Mijoz qo'shish</Button>} />
      ) : (
        <div className="clist">
          {list.map((c, i) => (
            <a key={c.id} className="crow" href={`#/app/customers/${c.id}`} style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
              <Avatar name={c.name} size={44} />
              <span className="crow__main"><b>{c.name}{c.telegram_chat_id && <Icon name="tg" size={13} className="crow__tg" />}</b><small>{c.phone || "Telefon yo'q"} · {ago(c.lastActivity)}</small></span>
              {c.overdue && <span className="tag tag--red">Muddati o'tgan</span>}
              {c.balance <= 0 && <span className="tag tag--green">Yopilgan</span>}
              <span className={`crow__bal ${c.balance > 0 ? "is-debt" : ""}`}>{money(Math.max(0, c.balance))}</span>
              <Icon name="arrowRight" size={18} className="crow__go" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ================= CUSTOMER DETAIL =================
function CustomerDetail({ id, data, reload, openTx, openCustomer, shop }) {
  const toast = useToast();
  const c = data.customers.find((x) => x.id === id);
  const [confirmDel, setConfirmDel] = useState(false);
  const [remind, setRemind] = useState(false);
  const txs = useMemo(() => data.transactions.filter((t) => t.customer_id === id), [data, id]);
  const timeline = useMemo(() => {
    const asc = [...txs].reverse();
    let run = 0;
    const withBal = asc.map((t) => ({ ...t, run: (run += t.type === "debt" ? +t.amount : -t.amount) }));
    return withBal.reverse();
  }, [txs]);
  if (!c) return <Empty icon="users" title="Mijoz topilmadi" action={<Button onClick={() => go("/app/customers")}>Ortga</Button>} />;
  const totalDebt = txs.filter((t) => t.type === "debt").reduce((a, t) => a + +t.amount, 0);
  const totalPaid = txs.filter((t) => t.type === "payment").reduce((a, t) => a + +t.amount, 0);
  const overLimit = c.credit_limit > 0 && c.balance > c.credit_limit;

  return (
    <div className="stack-lg">
      <section className="hero-card">
        <div className="hero-card__who">
          <Avatar name={c.name} size={64} />
          <div>
            <h2>{c.name} {c.telegram_chat_id && <span className="tg-badge" title="Telegram botga ulangan"><Icon name="tg" size={13} /> ulangan</span>}</h2>
            <p>{c.phone ? <a href={`tel:${c.phone.replace(/\s/g, "")}`}><Icon name="phone" size={14} /> {c.phone}</a> : "Telefon kiritilmagan"}{c.note && <> · {c.note}</>}</p>
          </div>
          <div className="hero-card__tools">
            <button className="icon-btn" title="Tahrirlash" onClick={() => openCustomer(c)}><Icon name="edit" size={18} /></button>
            <button className="icon-btn" title="O'chirish" onClick={() => setConfirmDel(true)}><Icon name="trash" size={18} /></button>
          </div>
        </div>
        <div className="hero-card__bal">
          <small>Joriy qarz</small>
          <b className={c.balance > 0 ? "is-debt" : "is-clear"}>{money(Math.max(0, c.balance))}</b>
          {c.balance < 0 && <span className="tag tag--green">Oldindan to'lov: {money(-c.balance)}</span>}
          {overLimit && <span className="tag tag--red">Limitdan oshgan ({money(c.credit_limit)})</span>}
          {c.overdue && <span className="tag tag--red">Muddati o'tgan</span>}
        </div>
        <div className="hero-card__actions">
          <Button variant="red" icon="plus" onClick={() => openTx({ customer: c, type: "debt" })}>Nasiya</Button>
          <Button variant="green" icon="check" onClick={() => openTx({ customer: c, type: "payment" })}>To'lov</Button>
          <Button variant="lime" icon="send" onClick={() => setRemind(true)} disabled={c.balance <= 0}>Eslatma</Button>
          <Button variant="outline" icon="link" onClick={() => window.open(publicLink(c.public_token), "_blank")}>Mijoz sahifasi</Button>
        </div>
        <div className="hero-card__stats">
          <div><small>Jami olingan</small><b>{money(totalDebt)}</b></div>
          <div><small>Jami to'langan</small><b>{money(totalPaid)}</b></div>
          <div><small>Yozuvlar</small><b>{txs.length}</b></div>
          <div><small>Mijoz bo'lgan</small><b>{date(c.created_at)}</b></div>
        </div>
      </section>

      <section className="card">
        <div className="card__head"><h3>Tarix</h3><span className="muted">{txs.length} ta yozuv</span></div>
        {!timeline.length ? <Empty icon="book" title="Hali yozuv yo'q" text="Birinchi nasiyani yozing." /> : (
          <div className="timeline">
            {timeline.map((t, i) => (
              <div key={t.id} className={`tl tl--${t.type}`} style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
                <span className="tl__dot"><Icon name={t.type === "debt" ? "plus" : "check"} size={14} stroke={2.8} /></span>
                <div className="tl__body">
                  <b>{t.type === "debt" ? "Nasiya" : "To'lov"}{t.note && <span> · {t.note}</span>}</b>
                  <small>{t.confirmed_at && <span className="ok-mark">✓ tasdiqlangan · </span>}{date(t.created_at, true)}{t.due_date && t.type === "debt" && <> · muddat: <em className={new Date(t.due_date) < new Date() ? "late" : ""}>{date(t.due_date)}</em></>}</small>
                </div>
                <div className="tl__amt">
                  <span className={`amt amt--${t.type}`}>{t.type === "debt" ? "+" : "−"}{money(t.amount)}</span>
                  <small>qoldiq: {money(t.run, false)}</small>
                </div>
                <button className="icon-btn tl__del" title="O'chirish" onClick={async () => {
                  if (!confirm("Bu yozuvni o'chirasizmi?")) return;
                  await api.deleteTx(t.id); toast("Yozuv o'chirildi"); reload();
                }}><Icon name="trash" size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Mijozni o'chirish">
        <p className="muted">"{c.name}" va uning barcha yozuvlari butunlay o'chiriladi. Buni qaytarib bo'lmaydi.</p>
        <div className="modal__foot">
          <Button variant="outline" onClick={() => setConfirmDel(false)}>Bekor qilish</Button>
          <Button variant="red" icon="trash" onClick={async () => {
            await api.deleteCustomer(c.id); toast("Mijoz o'chirildi"); await reload(); go("/app/customers");
          }}>O'chirish</Button>
        </div>
      </Modal>

      <ReminderModal open={remind} onClose={() => setRemind(false)} customer={c} shop={shop} />
    </div>
  );
}

function ReminderModal({ open, onClose, customer, shop }) {
  const toast = useToast();
  const [text, setText] = useState("");
  useEffect(() => { if (open) setText(reminderText(customer, shop)); }, [open]);
  const link = publicLink(customer.public_token);
  const phone = (customer.phone || "").replace(/[^\d+]/g, "");
  const [sending, setSending] = useState(false);
  const linked = !!customer.telegram_chat_id;
  return (
    <Modal open={open} onClose={onClose} title="Eslatma yuborish">
      {linked ? (
        <div className="botbox">
          <div><b><Icon name="tg" size={16} /> Mijoz botga ulangan</b><small>Xabar to'g'ridan-to'g'ri uning Telegramiga boradi</small></div>
          <Button variant="lime" icon="send" loading={sending} onClick={async () => {
            if (!api.canUseBot()) return toast(api.isDemo() ? "Demo rejimda bot xabar yubormaydi" : "config.js da telegramBot ko'rsatilmagan", "err");
            setSending(true);
            try { await api.notify(customer.id, "reminder"); toast("Bot orqali yuborildi"); onClose(); } catch (e) { toast(e.message, "err"); }
            setSending(false);
          }}>Bot orqali yuborish</Button>
        </div>
      ) : api.botName ? (
        <div className="botbox botbox--muted">
          <div><b>Mijoz hali botga ulanmagan</b><small>Quyidagi xabarda bot linki bor — u bossa, keyingi safar eslatmalar avtomatik boradi</small></div>
        </div>
      ) : null}
      <Field label="Xabar matni" hint="Matnni o'zgartirishingiz mumkin">
        <textarea className="input" rows={5} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="share">
        <a className="share__btn share__btn--tg" target="_blank" rel="noreferrer"
          href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text.replace(link, "").trim())}`}>
          <Icon name="tg" size={20} /> Telegram
        </a>
        <a className="share__btn" href={`sms:${phone}?body=${encodeURIComponent(text)}`}><Icon name="phone" size={20} /> SMS</a>
        <button className="share__btn" onClick={async () => {
          try { await navigator.clipboard.writeText(text); toast("Nusxa olindi"); } catch { toast("Nusxa olib bo'lmadi", "err"); }
        }}><Icon name="copy" size={20} /> Nusxa</button>
      </div>
    </Modal>
  );
}

// ================= SETTINGS =================
function Settings({ shop, reloadShop, data, reload }) {
  const toast = useToast();
  const [f, setF] = useState({ name: shop?.name || "", owner_name: shop?.owner_name || "", phone: shop?.phone || "", address: shop?.address || "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const plan = PLANS[shop?.plan || "free"];

  function exportCsv() {
    const rows = [["Mijoz", "Telefon", "Qarz (so'm)", "Yozuvlar", "Oxirgi faollik"],
      ...data.customers.map((c) => [c.name, c.phone || "", c.balance, c.txCount, date(c.lastActivity)])];
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `nasiya-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="grid-2 grid-2--settings">
      <section className="card">
        <div className="card__head"><h3>Do'kon ma'lumotlari</h3></div>
        <form className="stack" onSubmit={async (e) => {
          e.preventDefault();
          if (!f.name.trim()) return toast("Do'kon nomi bo'sh bo'lmasin", "err");
          setBusy(true);
          try { await api.updateShop(shop.id, f); await reloadShop(); toast("Saqlandi"); } catch (er) { toast(er.message, "err"); }
          setBusy(false);
        }}>
          <Field label="Do'kon nomi"><input className="input" value={f.name} onChange={set("name")} /></Field>
          <div className="grid2">
            <Field label="Egasi"><input className="input" value={f.owner_name} onChange={set("owner_name")} /></Field>
            <Field label="Telefon"><input className="input" value={f.phone} onChange={set("phone")} /></Field>
          </div>
          <Field label="Manzil" hint="Mijoz sahifasida ko'rsatiladi"><input className="input" value={f.address} onChange={set("address")} /></Field>
          <Button loading={busy} type="submit" icon="check">Saqlash</Button>
        </form>
      </section>
      <div className="stack-lg">
        <section className="card card--ink">
          <div className="card__head"><h3>Tarif: {plan.name}</h3></div>
          <p className="muted-light">{plan.price ? `${money(plan.price)} / oy` : "Bepul"} · {plan.limit === Infinity ? "cheksiz" : plan.limit + " tagacha"} mijoz</p>
          <div className="meter meter--light"><i style={{ width: `${Math.min(100, (data.customers.length / (plan.limit === Infinity ? 1e9 : plan.limit)) * 100)}%` }} /></div>
          <p className="muted-light">{data.customers.length} ta mijoz ishlatilmoqda</p>
          <Button variant="lime" icon="zap" onClick={() => toast("To'lov tizimi (Click/Payme) tez orada ulanadi")}>Tarifni oshirish</Button>
        </section>
        <section className="card">
          <div className="card__head"><h3>Ma'lumotlar</h3></div>
          <p className="muted">{api.userEmail()}</p>
          <div className="row-wrap">
            <Button variant="outline" icon="arrowUpRight" onClick={exportCsv}>Excel (CSV) yuklab olish</Button>
            {api.isDemo() && <Button variant="outline" icon="refresh" onClick={async () => { api.resetDemo(); await reload(); toast("Demo ma'lumotlar tiklandi"); }}>Demo'ni tiklash</Button>}
          </div>
        </section>
      </div>
    </div>
  );
}

// ================= MODALS =================
function TxModal({ state, onClose, customers, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (state) { setF({ type: state.type || "debt", customer_id: state.customer?.id || "", amount: "", note: "", due_date: "" }); setQ(""); }
  }, [state]);
  if (!state) return null;
  const isDebt = f.type === "debt";
  const chosen = customers.find((c) => c.id === f.customer_id);
  const quick = isDebt ? [10000, 25000, 50000, 100000] : chosen?.balance > 0 ? [chosen.balance] : [];
  const filtered = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6);

  async function submit(e) {
    e.preventDefault();
    const amount = parseAmount(f.amount);
    if (!f.customer_id) return toast("Mijozni tanlang", "err");
    if (!amount) return toast("Summani kiriting", "err");
    setBusy(true);
    try {
      await api.addTx({ customer_id: f.customer_id, type: f.type, amount, note: f.note.trim() || null, due_date: isDebt && f.due_date ? f.due_date : null });
      const target = state.customer || chosen;
      const viaBot = target?.telegram_chat_id && api.canUseBot();
      if (viaBot) api.notify(target.id, "tx").catch(() => {});
      toast((isDebt ? "Nasiya yozildi" : "To'lov qabul qilindi") + (viaBot ? " · mijozga Telegram xabar ketdi" : ""));
      await onDone();
    } catch (er) { toast(er.message, "err"); }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title={isDebt ? "Yangi nasiya" : "To'lov qabul qilish"}>
      <form className="stack" onSubmit={submit}>
        <div className="seg">
          <button type="button" className={isDebt ? "is-on is-debt" : ""} onClick={() => setF({ ...f, type: "debt" })}>Nasiya berish</button>
          <button type="button" className={!isDebt ? "is-on is-pay" : ""} onClick={() => setF({ ...f, type: "payment" })}>To'lov olish</button>
        </div>
        {!state.customer && (
          <Field label="Mijoz">
            {chosen ? (
              <div className="picked"><Avatar name={chosen.name} size={30} /><b>{chosen.name}</b><span className="muted">{money(Math.max(0, chosen.balance))}</span>
                <button type="button" className="icon-btn" onClick={() => setF({ ...f, customer_id: "" })}><Icon name="x" size={16} /></button></div>
            ) : (
              <>
                <input className="input" placeholder="Ism bo'yicha qidiring…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
                <div className="pick">
                  {filtered.map((c) => (
                    <button type="button" key={c.id} onClick={() => setF({ ...f, customer_id: c.id })}><Avatar name={c.name} size={26} />{c.name}<small>{money(Math.max(0, c.balance), false)}</small></button>
                  ))}
                  {!filtered.length && <span className="muted">Mijoz topilmadi — avval "Mijozlar" bo'limida qo'shing.</span>}
                </div>
              </>
            )}
          </Field>
        )}
        {state.customer && <div className="picked"><Avatar name={state.customer.name} size={30} /><b>{state.customer.name}</b><span className="muted">qarz: {money(Math.max(0, state.customer.balance))}</span></div>}
        <Field label="Summa (so'm)">
          <input className={`input input--big ${isDebt ? "is-debt" : "is-pay"}`} inputMode="numeric" placeholder="0" value={f.amount}
            onChange={(e) => setF({ ...f, amount: formatInput(e.target.value) })} autoFocus={!!state.customer} />
        </Field>
        {quick.length > 0 && (
          <div className="quick">{quick.map((v) => <button type="button" key={v} onClick={() => setF({ ...f, amount: formatInput(String(v)) })}>{isDebt ? "" : "To'liq: "}{money(v, false)}</button>)}</div>
        )}
        <Field label="Izoh"><input className="input" placeholder={isDebt ? "Masalan: un 10 kg, yog'" : "Masalan: naqd, Click"} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        {isDebt && <Field label="Qaytarish muddati (ixtiyoriy)"><input className="input" type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>}
        <div className="modal__foot">
          <Button variant="outline" type="button" onClick={onClose}>Bekor qilish</Button>
          <Button variant={isDebt ? "red" : "green"} loading={busy} type="submit" icon="check">{isDebt ? "Nasiyani yozish" : "To'lovni saqlash"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CustomerModal({ state, onClose, onDone }) {
  const toast = useToast();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (state) setF({ name: state.name || "", phone: state.phone || "", note: state.note || "", credit_limit: state.credit_limit ? formatInput(String(state.credit_limit)) : "" });
  }, [state]);
  if (!state) return null;
  const isEdit = !!state.id;
  return (
    <Modal open onClose={onClose} title={isEdit ? "Mijozni tahrirlash" : "Yangi mijoz"}>
      <form className="stack" onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim()) return toast("Ismni kiriting", "err");
        setBusy(true);
        try {
          const row = { name: f.name.trim(), phone: f.phone.trim() || null, note: f.note.trim() || null, credit_limit: parseAmount(f.credit_limit) };
          const c = isEdit ? await api.updateCustomer(state.id, row) : await api.addCustomer(row);
          toast(isEdit ? "Saqlandi" : "Mijoz qo'shildi");
          await onDone(c, !isEdit);
        } catch (er) { toast(er.message, "err"); }
        setBusy(false);
      }}>
        <Field label="Ism"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Masalan: Ali aka" autoFocus /></Field>
        <Field label="Telefon"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+998 90 123 45 67" inputMode="tel" /></Field>
        <Field label="Nasiya limiti (so'm)" hint="Bu summadan oshsa ogohlantiramiz. Bo'sh = limitsiz">
          <input className="input" inputMode="numeric" value={f.credit_limit} onChange={(e) => setF({ ...f, credit_limit: formatInput(e.target.value) })} placeholder="500 000" />
        </Field>
        <Field label="Izoh"><input className="input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Masalan: 3-uy, doimiy mijoz" /></Field>
        <div className="modal__foot">
          <Button variant="outline" type="button" onClick={onClose}>Bekor qilish</Button>
          <Button loading={busy} type="submit" icon="check">{isEdit ? "Saqlash" : "Qo'shish"}</Button>
        </div>
      </form>
    </Modal>
  );
}
