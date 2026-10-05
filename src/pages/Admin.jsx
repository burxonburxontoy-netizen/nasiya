import { useEffect, useMemo, useState } from "react";
import { Icon, Logo, Avatar, Button, Empty, Spinner, useToast } from "../components/ui.jsx";
import { LineChart, Bars, Donut } from "../components/Charts.jsx";
import * as api from "../lib/api.js";
import { go, money, date, PLANS, MONTHS_FULL, useCountUp } from "../lib/util.js";

function Stat({ label, value, isMoney, icon, delay }) {
  const v = useCountUp(value, true, 1100);
  return (
    <div className="kpi kpi--plain" style={{ animationDelay: `${delay}ms` }}>
      <div className="kpi__top"><span>{label}</span><i><Icon name={icon} size={18} /></i></div>
      <b>{isMoney ? money(v, false) : Math.round(v)}{isMoney && <small> so'm</small>}</b>
    </div>
  );
}

export default function Admin({ shop }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const [planF, setPlanF] = useState("all");
  const load = async () => { try { setD(await api.adminData()); } catch (e) { toast(e.message, "err"); } };
  useEffect(() => { load(); }, []);

  const months = useMemo(() => {
    if (!d) return [];
    const now = new Date();
    const out = [];
    for (let i = 5; i >= 0; i--) {
      const x = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ y: x.getFullYear(), m: x.getMonth(), label: MONTHS_FULL[x.getMonth()].slice(0, 3).replace("Iyu", x.getMonth() === 5 ? "Iyn" : "Iyl"), debt: 0, payment: 0 });
    }
    for (const t of d.transactions) {
      const x = new Date(t.created_at);
      const b = out.find((o) => o.y === x.getFullYear() && o.m === x.getMonth());
      if (b) b[t.type] += +t.amount;
    }
    return out;
  }, [d]);

  if (!shop?.is_admin) {
    return (
      <div className="center-page">
        <Empty icon="shield" title="Ruxsat yo'q" text="Bu sahifa faqat administratorlar uchun."
          action={<Button onClick={() => go("/app")}>Panelga qaytish</Button>} />
      </div>
    );
  }

  const shops = d?.shops.filter((s) => !s.is_admin) || [];
  const active = shops.filter((s) => s.is_active);
  const mrr = active.reduce((a, s) => a + (PLANS[s.plan]?.price || 0), 0);
  const volume = d ? d.transactions.reduce((a, t) => a + +t.amount, 0) : 0;
  const planCount = (k) => shops.filter((s) => s.plan === k).length;
  const list = shops
    .filter((s) => (s.name + " " + (s.owner_name || "") + " " + (s.address || "")).toLowerCase().includes(q.toLowerCase()))
    .filter((s) => planF === "all" || s.plan === planF)
    .sort((a, b) => b.debt - a.debt);

  async function patch(s, p) {
    try { await api.updateShop(s.id, p); toast("Yangilandi"); load(); } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <a href="#/" className="admin__logo"><Logo light /> <span className="tag tag--lime">Admin</span></a>
        <div className="admin__bar-r">
          <a href="#/app" className="admin__link"><Icon name="store" size={17} /> Do'kon paneli</a>
          <button className="admin__link" onClick={async () => { await api.signOut(); go("/"); }}><Icon name="logout" size={17} /> Chiqish</button>
        </div>
      </header>

      <main className="admin__main container">
        <div className="admin__title">
          <div><small className="muted">Platforma boshqaruvi</small><h1>Umumiy ko'rinish</h1></div>
          <Button variant="outline" icon="refresh" onClick={load}>Yangilash</Button>
        </div>

        {!d ? <div className="loading"><Spinner size={32} /></div> : (
          <div className="stack-lg">
            <div className="kpis">
              <Stat label="Do'konlar" value={shops.length} icon="store" delay={0} />
              <Stat label="Faol do'konlar" value={active.length} icon="check" delay={70} />
              <Stat label="Oylik daromad (MRR)" value={mrr} isMoney icon="wallet" delay={140} />
              <Stat label="Umumiy aylanma" value={volume} isMoney icon="chart" delay={210} />
            </div>

            <div className="grid-main">
              <section className="card">
                <div className="card__head"><h3>Platformadagi nasiya oqimi</h3><span className="muted">barcha do'konlar</span></div>
                <LineChart data={months} series={[
                  { key: "debt", label: "Berildi", color: "#FF5B37" },
                  { key: "payment", label: "Qaytdi", color: "#15A365" },
                ]} />
              </section>
              <section className="card card--center">
                <div className="card__head"><h3>Tariflar</h3></div>
                <Donut label={shops.length} sub="do'kon" parts={[
                  { value: planCount("free"), color: "#D9D3C4" }, { value: planCount("pro"), color: "#16130F" }, { value: planCount("business"), color: "#B7E62E" },
                ]} />
                <div className="legend-rows">
                  <div><i style={{ background: "#D9D3C4" }} />Bepul <b>{planCount("free")}</b></div>
                  <div><i style={{ background: "#16130F" }} />Pro <b>{planCount("pro")}</b></div>
                  <div><i style={{ background: "#B7E62E" }} />Biznes <b>{planCount("business")}</b></div>
                </div>
              </section>
            </div>

            <section className="card">
              <div className="card__head"><h3>Eng faol do'konlar</h3><span className="muted">mijozlar soni bo'yicha</span></div>
              <Bars items={[...shops].sort((a, b) => b.customers - a.customers).slice(0, 6).map((s) => ({ label: s.name, value: s.customers, display: `${s.customers} mijoz` }))} />
            </section>

            <section className="card card--flush">
              <div className="card__head card__head--pad">
                <h3>Do'konlar</h3>
                <div className="toolbar toolbar--tight">
                  <div className="search"><Icon name="search" size={17} /><input placeholder="Qidirish…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                  <select className="input select" value={planF} onChange={(e) => setPlanF(e.target.value)}>
                    <option value="all">Barcha tariflar</option>
                    <option value="free">Bepul</option><option value="pro">Pro</option><option value="business">Biznes</option>
                  </select>
                </div>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Do'kon</th><th>Hudud</th><th>Mijozlar</th><th>Ochiq nasiya</th><th>Tarif</th><th>Holat</th><th>Qo'shilgan</th></tr></thead>
                  <tbody>
                    {list.map((s, i) => (
                      <tr key={s.id} style={{ animationDelay: `${i * 40}ms` }}>
                        <td><div className="cell-who"><Avatar name={s.name} size={34} /><span><b>{s.name}</b><small>{s.owner_name} · {s.phone}</small></span></div></td>
                        <td>{s.address || "—"}</td>
                        <td>{s.customers}</td>
                        <td><b>{money(Math.max(0, s.debt))}</b></td>
                        <td>
                          <select className={`plan-sel plan-sel--${s.plan}`} value={s.plan} onChange={(e) => patch(s, { plan: e.target.value })}>
                            <option value="free">Bepul</option><option value="pro">Pro</option><option value="business">Biznes</option>
                          </select>
                        </td>
                        <td>
                          <button className={`switch ${s.is_active ? "is-on" : ""}`} onClick={() => patch(s, { is_active: !s.is_active })} aria-label="Holat">
                            <i />
                          </button>
                        </td>
                        <td className="muted">{date(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!list.length && <Empty icon="store" title="Do'kon topilmadi" />}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
