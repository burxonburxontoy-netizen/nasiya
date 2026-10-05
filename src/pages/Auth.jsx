import { useState } from "react";
import { Button, Field, Icon, Logo } from "../components/ui.jsx";
import { go, money } from "../lib/util.js";
import { signIn, signUp, demoLogin, hasSupabase } from "../lib/api.js";

export default function Auth({ mode = "login", onAuthed }) {
  const isReg = mode === "register";
  const [f, setF] = useState({ email: "", password: "", shop_name: "", owner_name: "", phone: "" });
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr(""); setInfo("");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Email noto'g'ri kiritildi");
    if (f.password.length < 6) return setErr("Parol kamida 6 belgidan iborat bo'lsin");
    if (isReg && !f.shop_name.trim()) return setErr("Do'kon nomini kiriting");
    setBusy(true);
    try {
      if (isReg) {
        const r = await signUp(f);
        if (r.needsConfirm) { setInfo("Pochtangizga tasdiqlash xati yuborildi. Tasdiqlab, so'ng kiring."); setBusy(false); return; }
      } else {
        await signIn(f);
      }
      await onAuthed?.();
      go("/app");
    } catch (e2) {
      setErr(e2.message || "Xatolik yuz berdi");
    }
    setBusy(false);
  }

  async function demo(role) {
    setBusy(true);
    await demoLogin(role);
    await onAuthed?.();
    go(role === "admin" ? "/admin" : "/app");
  }

  return (
    <div className="auth">
      <div className="auth__form">
        <a href="#/" className="auth__back"><Icon name="arrowLeft" size={18} /> Bosh sahifa</a>
        <div className="auth__box">
          <Logo size={34} />
          <h1>{isReg ? "Do'koningizni ro'yxatdan o'tkazing" : "Qaytganingizdan xursandmiz"}</h1>
          <p className="muted">{isReg ? "30 soniya — va daftar telefoningizda." : "Hisobingizga kiring."}</p>

          {!hasSupabase && (
            <div className="note"><Icon name="zap" size={16} /> Hozir DEMO rejim: ma'lumotlar shu brauzerda saqlanadi.</div>
          )}

          <form onSubmit={submit} className="stack">
            {isReg && (
              <>
                <Field label="Do'kon nomi"><input className="input" value={f.shop_name} onChange={set("shop_name")} placeholder="Masalan: Baraka market" /></Field>
                <div className="grid2">
                  <Field label="Ismingiz"><input className="input" value={f.owner_name} onChange={set("owner_name")} placeholder="Jahongir" /></Field>
                  <Field label="Telefon"><input className="input" value={f.phone} onChange={set("phone")} placeholder="+998 90 123 45 67" /></Field>
                </div>
              </>
            )}
            <Field label="Email"><input className="input" type="email" value={f.email} onChange={set("email")} placeholder="siz@gmail.com" autoComplete="email" /></Field>
            <Field label="Parol"><input className="input" type="password" value={f.password} onChange={set("password")} placeholder="Kamida 6 belgi" autoComplete={isReg ? "new-password" : "current-password"} /></Field>
            {err && <div className="alert alert--err"><Icon name="alert" size={16} />{err}</div>}
            {info && <div className="alert alert--ok"><Icon name="check" size={16} />{info}</div>}
            <Button size="lg" loading={busy} type="submit">{isReg ? "Ro'yxatdan o'tish" : "Kirish"}</Button>
          </form>

          <div className="auth__or"><span>yoki tezda sinab ko'ring</span></div>
          <div className="grid2">
            <Button variant="outline" icon="store" onClick={() => demo("owner")} disabled={busy}>Do'kondor demo</Button>
            <Button variant="outline" icon="shield" onClick={() => demo("admin")} disabled={busy}>Admin demo</Button>
          </div>

          <p className="auth__switch">
            {isReg ? <>Hisobingiz bormi? <a href="#/login">Kirish</a></> : <>Hisobingiz yo'qmi? <a href="#/register">Ro'yxatdan o'ting</a></>}
          </p>
        </div>
      </div>

      <div className="auth__art">
        <div className="auth__art-inner">
          <div className="paper-card paper-card--1">
            <span className="hand">Ali aka — non, yog' — 45k</span>
            <span className="hand">Dilnoza — un — 120k</span>
            <span className="hand strike">Sardor — go'sht — 190k</span>
          </div>
          <div className="glass-card">
            <small>Shu oy qaytgan</small>
            <b>{money(2_840_000)}</b>
            <span className="up"><Icon name="arrowUpRight" size={14} /> 34%</span>
          </div>
          <div className="auth__claim">
            <h2>Mijoz linkni ochadi —<br />qarzini <em>o'zi</em> ko'radi.</h2>
            <p>Tortishuv yo'q. Unutish yo'q. Yo'qolgan daftar yo'q.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
