import { useEffect, useRef, useState } from "react";
import { Icon, Logo, Reveal, Button } from "../components/ui.jsx";
import { go, money, useScrollProgress, seg, ease, useInView, useCountUp, PLANS } from "../lib/util.js";
import { demoLogin } from "../lib/api.js";

// ---------- NAV ----------
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const link = (id, t) => (
    <a href={`#/`} onClick={(e) => { e.preventDefault(); setOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }}>{t}</a>
  );
  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""} ${open ? "nav--open" : ""}`}>
      <div className="nav__inner">
        <a href="#/" className="nav__logo"><Logo /></a>
        <nav className="nav__links">
          {link("how", "Qanday ishlaydi")}
          {link("features", "Imkoniyatlar")}
          {link("pricing", "Narxlar")}
          {link("faq", "Savollar")}
        </nav>
        <div className="nav__cta">
          <a className="nav__login" href="#/login">Kirish</a>
          <Button size="sm" onClick={() => go("/register")}>Bepul boshlash</Button>
        </div>
        <button className="icon-btn nav__burger" onClick={() => setOpen(!open)} aria-label="Menyu"><Icon name={open ? "x" : "menu"} /></button>
      </div>
    </header>
  );
}

// ---------- HERO ----------
function SplitWords({ text, delay = 0, className = "" }) {
  return (
    <span className={`split ${className}`}>
      {text.split(" ").map((w, i) => (
        <span key={i}><span className="split__w"><span style={{ animationDelay: `${delay + i * 90}ms` }}>{w}</span></span>{" "}</span>
      ))}
    </span>
  );
}

const NOTIFS = [
  { icon: "check", tone: "green", t: "Ali aka to'lov qildi", s: "+ 45 000 so'm" },
  { icon: "bell", tone: "lime", t: "Eslatma yuborildi", s: "Dilnoza opa · 120 000 so'm" },
  { icon: "plus", tone: "red", t: "Yangi nasiya", s: "Sardor · Un 10 kg · 95 000" },
  { icon: "check", tone: "green", t: "Malika to'liq yopdi", s: "Qarz: 0 so'm 🎉" },
];

function HeroPhone() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setK((x) => x + 1), 2400);
    return () => clearInterval(t);
  }, []);
  const shown = [0, 1, 2].map((i) => NOTIFS[(k + i) % NOTIFS.length]);
  return (
    <div className="hero-phone">
      <div className="hero-phone__glow" />
      <div className="phone">
        <div className="phone__notch" />
        <div className="phone__screen">
          <div className="ps-head">
            <span className="ps-hello">Assalomu alaykum,<b>Baraka market</b></span>
            <span className="ps-ava">BM</span>
          </div>
          <div className="ps-total">
            <span>Umumiy nasiya</span>
            <b>{money(4_385_000)}</b>
            <div className="ps-spark">
              {[40, 62, 48, 75, 58, 82, 66, 90, 72].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }} />)}
            </div>
          </div>
          <div className="ps-list" key={k}>
            {shown.map((n, i) => (
              <div className="ps-item" key={i} style={{ animationDelay: `${i * 90}ms` }}>
                <span className={`ps-ic ps-ic--${n.tone}`}><Icon name={n.icon} size={15} stroke={2.6} /></span>
                <span><b>{n.t}</b><small>{n.s}</small></span>
              </div>
            ))}
          </div>
          <div className="ps-fab"><Icon name="plus" size={16} stroke={3} /> Nasiya yozish</div>
        </div>
      </div>
      <div className="sticker sticker--1"><span>Daftar</span> yo'qolmaydi</div>
      <div className="sticker sticker--2"><Icon name="tg" size={16} /> Telegram eslatma</div>
    </div>
  );
}

function Hero() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const on = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    el.addEventListener("pointermove", on);
    return () => el.removeEventListener("pointermove", on);
  }, []);
  const [busy, setBusy] = useState(false);
  return (
    <section className="hero" ref={ref}>
      <div className="hero__ruled" />
      <div className="container hero__grid">
        <div className="hero__copy">
          <div className="pill fade-up" style={{ animationDelay: "50ms" }}>
            <span className="pill__dot" /> Mahalla do'konlari uchun yangi avlod
          </div>
          <h1 className="hero__title">
            <SplitWords text="Nasiya daftarini" delay={120} />
            <span className="hero__strike"><SplitWords text="qog'ozda" delay={320} /><svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="M4 18 C 60 6, 120 26, 180 12 S 270 8, 296 16" /></svg></span>{" "}
            <SplitWords text="emas, telefonda yuriting." delay={420} />
          </h1>
          <p className="hero__lead fade-up" style={{ animationDelay: "750ms" }}>
            Kim qancha olganini yozing — mijozga Telegram orqali avtomatik eslatma boradi,
            u o'z qarzini linkda ko'radi. Tortishuvsiz, unutishsiz.
          </p>
          <div className="hero__ctas fade-up" style={{ animationDelay: "880ms" }}>
            <Button size="lg" icon="arrowRight" onClick={() => go("/register")}>Bepul boshlash</Button>
            <Button size="lg" variant="ghost" icon="eye" loading={busy}
              onClick={async () => { setBusy(true); await demoLogin("owner"); go("/app"); }}>
              Demo'ni ko'rish
            </Button>
          </div>
          <div className="hero__trust fade-up" style={{ animationDelay: "1000ms" }}>
            <div className="hero__avatars">{["JK", "NU", "DR", "FE"].map((x, i) => <span key={i}>{x}</span>)}</div>
            <span>Karta va shartnoma talab qilinmaydi. <b>30 soniyada</b> boshlang.</span>
          </div>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}

function Marquee() {
  const items = ["Oziq-ovqat do'konlari", "Novvoyxonalar", "Qurilish mollari", "Dorixonalar", "Kiyim do'konlari",
    "Go'sht do'konlari", "Ulgurji savdo", "Maishiy texnika", "Sabzavot rastalari", "Avto ehtiyot qismlar"];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {[...items, ...items].map((t, i) => <span key={i}>{t}<i>✦</i></span>)}
      </div>
    </div>
  );
}

// ---------- SCROLL STORY: daftar -> telefon ----------
const ROWS = [
  { name: "Ali aka", what: "non, yog'", sum: 45000 },
  { name: "Dilnoza opa", what: "un 10kg", sum: 120000 },
  { name: "Sardor", what: "go'sht 2kg", sum: 190000 },
  { name: "Malika", what: "shakar, choy", sum: 38000 },
];
const STEPS = [
  { n: "01", t: "Yozing", d: "Nasiyani 2 bosishda qo'shing: mijoz, summa, izoh. Daftar varaqlash yo'q." },
  { n: "02", t: "Eslating", d: "Muddati yetganda mijozga Telegram yoki SMS orqali bir bosishda eslatma yuboring." },
  { n: "03", t: "Undiring", d: "Mijoz o'z qarzini shaxsiy linkda ko'radi va tasdiqlaydi. Pul tezroq qaytadi." },
];

function Story() {
  const wrap = useRef(null);
  const p = useScrollProgress(wrap);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const on = () => {
      const w = stageRef.current?.parentElement?.clientWidth || 900;
      const h = window.innerHeight * 0.62;
      setScale(Math.min(1, w / 900, h / 540));
    };
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  const step = p < 0.38 ? 0 : p < 0.7 ? 1 : 2;
  const book = ease(seg(p, 0.55, 0.8));
  const phoneIn = ease(seg(p, 0.02, 0.2));
  const remind = ease(seg(p, 0.62, 0.76));
  const paid = ease(seg(p, 0.82, 0.95));

  return (
    <section className="story" id="how" ref={wrap}>
      <div className="story__sticky">
        <div className="container story__grid">
          <div className="story__copy">
            <span className="eyebrow eyebrow--light">Qanday ishlaydi</span>
            <h2 className="story__title">Daftardan telefonga — <em>3 qadam</em></h2>
            <div className="story__steps">
              {STEPS.map((s, i) => (
                <div key={i} className={`story__step ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}>
                  <span className="story__n">{s.n}</span>
                  <div><h4>{s.t}</h4><p>{s.d}</p></div>
                </div>
              ))}
            </div>
            <div className="story__bar"><i style={{ transform: `scaleX(${p})` }} /></div>
          </div>

          <div className="story__stagewrap">
            <div className="story__stage" ref={stageRef} style={{ transform: `scale(${scale})` }}>
              {/* Notebook */}
              <div className="nb" style={{ opacity: 1 - book, transform: `translate(${-60 * book}px, ${40 * book}px) rotate(${-4 - 8 * book}deg)` }}>
                <div className="nb__holes">{Array.from({ length: 9 }).map((_, i) => <i key={i} />)}</div>
                <div className="nb__title">Nasiya — oktabr</div>
                <div className="nb__lines" />
                <div className="nb__coffee" />
              </div>

              {/* Phone */}
              <div className="sphone" style={{ opacity: phoneIn, transform: `translateY(${(1 - phoneIn) * 80}px) rotate(${(1 - phoneIn) * 8}deg)` }}>
                <div className="sphone__head">
                  <small>Umumiy nasiya</small>
                  <b>{money(ROWS.reduce((a, r) => a + r.sum, 0) - (paid > 0.5 ? 45000 : 0))}</b>
                </div>
                <div className="sphone__toast" style={{ opacity: remind * (1 - paid), transform: `translateY(${(1 - remind) * -20}px)` }}>
                  <Icon name="tg" size={16} /> Eslatma yuborildi: Ali aka
                </div>
                <div className="sphone__toast sphone__toast--ok" style={{ opacity: paid, transform: `translateY(${(1 - paid) * -20}px)` }}>
                  <Icon name="check" size={16} stroke={3} /> Ali aka to'ladi: 45 000 so'm
                </div>
              </div>

              {/* Flying rows */}
              {ROWS.map((r, i) => {
                const t = ease(seg(p, 0.12 + i * 0.07, 0.34 + i * 0.07));
                const from = { x: 92, y: 140 + i * 62 };
                const to = { x: 578, y: 168 + i * 76 };
                const x = from.x + (to.x - from.x) * t;
                const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 70;
                const rot = Math.sin(t * Math.PI) * (i % 2 ? 7 : -7) + (1 - t) * -4;
                const isPaid = i === 0 && paid > 0.5;
                return (
                  <div key={i} className="frow" style={{ transform: `translate(${x}px, ${y}px) rotate(${rot}deg)` }}>
                    <div className="frow__hand" style={{ opacity: 1 - seg(t, 0.35, 0.7) }}>
                      {r.name} — {r.what} <b>{(r.sum / 1000)}k</b>
                    </div>
                    <div className={`frow__card ${isPaid ? "is-paid" : ""}`} style={{ opacity: seg(t, 0.45, 0.85), transform: `scale(${0.85 + 0.15 * t})` }}>
                      <span className="frow__ava">{r.name[0]}</span>
                      <span className="frow__name"><b>{r.name}</b><small>{r.what}</small></span>
                      <span className="frow__sum">{isPaid ? "0" : money(r.sum, false)}</span>
                      {i === 0 && <span className="frow__ping" style={{ opacity: remind * (1 - paid) }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- FEATURES (bento) ----------
function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <Reveal className="section__head">
          <span className="eyebrow">Imkoniyatlar</span>
          <h2>Daftar qila olmaydigan<br />hamma narsa.</h2>
        </Reveal>
        <div className="bento">
          <Reveal className="bento__c bento__c--wide bento__c--ink" delay={0}>
            <div className="bento__txt">
              <Icon name="tg" size={26} />
              <h3>Telegram orqali eslatma</h3>
              <p>Bir bosishda mijozga tayyor xabar: summa, muddat va shaxsiy link. Noqulay suhbatlar endi yo'q.</p>
            </div>
            <div className="chatdemo">
              <div className="bubble bubble--in">Assalomu alaykum, Ali aka! Baraka market'dagi nasiyangiz: <b>45 000 so'm</b>. Muddat: 12-oktabr.</div>
              <div className="bubble bubble--link"><Icon name="link" size={14} /> nasiya.uz/c/8f2a…</div>
              <div className="bubble bubble--out">Rahmat, ertaga olib kelaman 👍</div>
            </div>
          </Reveal>
          <Reveal className="bento__c" delay={80}>
            <div className="bento__txt">
              <Icon name="link" size={26} />
              <h3>Mijoz uchun shaxsiy sahifa</h3>
              <p>Har bir mijoz o'z qarzi va tarixini ko'radi. Ishonch oshadi, tortishuv yo'qoladi.</p>
            </div>
            <div className="linkdemo"><span>nasiya.uz/c/</span><b>ali-aka</b><i><Icon name="copy" size={14} /></i></div>
          </Reveal>
          <Reveal className="bento__c" delay={0}>
            <div className="bento__txt">
              <Icon name="chart" size={26} />
              <h3>Jonli statistika</h3>
              <p>Kim eng ko'p qarzdor, qaysi oy qancha qaytdi — hammasi grafikda.</p>
            </div>
            <div className="minibars">{[35, 60, 45, 80, 55, 95, 70].map((h, i) => <i key={i} style={{ "--h": `${h}%`, transitionDelay: `${i * 60}ms` }} />)}</div>
          </Reveal>
          <Reveal className="bento__c bento__c--lime" delay={80}>
            <div className="bento__txt">
              <Icon name="clock" size={26} />
              <h3>Muddat nazorati</h3>
              <p>Muddati o'tgan nasiyalar qizil bilan belgilanadi. Hech kim esdan chiqmaydi.</p>
            </div>
            <div className="duedemo">
              <span className="due due--late">Muddati o'tdi · 3 kun</span>
              <span className="due due--soon">Ertaga</span>
              <span className="due due--ok">12-okt</span>
            </div>
          </Reveal>
          <Reveal className="bento__c" delay={160}>
            <div className="bento__txt">
              <Icon name="shield" size={26} />
              <h3>Xavfsiz va zaxirali</h3>
              <p>Ma'lumotlar bulutda shifrlangan holda saqlanadi. Telefon yo'qolsa ham daftar joyida.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Numbers() {
  const [ref, seen] = useInView();
  const a = useCountUp(30, seen), b = useCountUp(0, seen), c = useCountUp(24, seen);
  return (
    <section className="numbers" ref={ref}>
      <div className="container numbers__grid">
        <div><b>{Math.round(a)}<small>sek</small></b><span>yangi nasiya yozish uchun yetarli</span></div>
        <div><b>{Math.round(b)}<small>so'm</small></b><span>boshlash uchun — bepul tarif doimiy</span></div>
        <div><b>{Math.round(c)}/7</b><span>mijoz o'z qarzini istalgan payt ko'radi</span></div>
      </div>
    </section>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(false);
  const plans = [
    { key: "free", desc: "Kichik rasta va yangi boshlaganlar uchun", feats: ["30 tagacha mijoz", "Cheksiz yozuvlar", "Mijoz linki", "Asosiy statistika"] },
    { key: "pro", desc: "Mahalla do'koni uchun eng mosi", hot: true, feats: ["500 tagacha mijoz", "Telegram eslatmalar", "Muddat nazorati", "To'liq statistika", "Excel eksport"] },
    { key: "business", desc: "Bir nechta filial va ulgurji savdo", feats: ["Cheksiz mijozlar", "Bir nechta xodim", "Filiallar", "Ustuvor yordam", "API"] },
  ];
  return (
    <section className="section section--paper" id="pricing">
      <div className="container">
        <Reveal className="section__head section__head--center">
          <span className="eyebrow">Narxlar</span>
          <h2>Bir qop un narxidan arzon.</h2>
          <div className="toggle">
            <button className={!yearly ? "is-on" : ""} onClick={() => setYearly(false)}>Oylik</button>
            <button className={yearly ? "is-on" : ""} onClick={() => setYearly(true)}>Yillik <em>−20%</em></button>
          </div>
        </Reveal>
        <div className="pricing">
          {plans.map((p, i) => {
            const P = PLANS[p.key];
            const price = yearly ? Math.round((P.price * 0.8) / 1000) * 1000 : P.price;
            return (
              <Reveal key={p.key} delay={i * 90} className={`plan ${p.hot ? "plan--hot" : ""}`}>
                {p.hot && <span className="plan__badge">Ommabop</span>}
                <h3>{P.name}</h3>
                <p className="plan__desc">{p.desc}</p>
                <div className="plan__price"><b>{price ? money(price, false) : "0"}</b><span>so'm / oy</span></div>
                <ul>{p.feats.map((f) => <li key={f}><Icon name="check" size={16} stroke={3} />{f}</li>)}</ul>
                <Button variant={p.hot ? "lime" : "outline"} className="plan__btn" onClick={() => go("/register")}>
                  {price ? "Sinab ko'rish" : "Bepul boshlash"}
                </Button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    ["Mijozlarim ham ilovani o'rnatishi kerakmi?", "Yo'q. Mijoz faqat sizdan kelgan linkni ochadi — o'rnatish, ro'yxatdan o'tish shart emas."],
    ["Internet bo'lmasa nima bo'ladi?", "Ma'lumotlar bulutda saqlanadi. Internet qaytgach, hammasi joyida bo'ladi — telefon almashsa ham."],
    ["Ma'lumotlarimni boshqalar ko'ra oladimi?", "Yo'q. Har bir do'kon faqat o'z mijozlarini ko'radi. Mijoz esa faqat o'z qarzini ko'radi."],
    ["Bepul tarif qachongacha?", "Doimiy. 30 tagacha mijoz bilan cheksiz muddat bepul foydalanasiz."],
    ["Telegram bot qanday ishlaydi?", "Mijoz do'kon yuborgan link orqali botga bir marta ulanadi. Shundan keyin har bir yangi nasiya va to'lov haqida xabar oladi, bot ichidagi mini-ilovada tarixni ko'radi va tasdiqlaydi."],
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="section" id="faq">
      <div className="container faq">
        <Reveal className="section__head">
          <span className="eyebrow">Savollar</span>
          <h2>Ko'p so'raladigan<br />savollar</h2>
        </Reveal>
        <div className="faq__list">
          {items.map(([q, a], i) => (
            <Reveal key={i} delay={i * 60} className={`faq__item ${open === i ? "is-open" : ""}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)}>
                <span>{q}</span><i><Icon name="plus" size={18} /></i>
              </button>
              <div className="faq__a"><p>{a}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="cta">
      <div className="container">
        <Reveal><h2 className="cta__title">Daftarni yoping.<br /><span>Nasiya'ni oching.</span></h2></Reveal>
        <Reveal delay={120} className="cta__btns">
          <Button size="lg" variant="lime" icon="arrowRight" onClick={() => go("/register")}>Bepul boshlash</Button>
          <Button size="lg" variant="ghost-light" icon="eye" onClick={async () => { await demoLogin("owner"); go("/app"); }}>Demo</Button>
        </Reveal>
      </div>
      <footer className="footer container">
        <Logo light />
        <span>© {new Date().getFullYear()} Nasiya. Toshkent'da ishlab chiqilgan.</span>
        <a href="#/admin-demo" onClick={async (e) => { e.preventDefault(); await demoLogin("admin"); go("/admin"); }}>Admin demo →</a>
      </footer>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="landing">
      <Nav />
      <Hero />
      <Marquee />
      <Story />
      <Features />
      <Numbers />
      <Pricing />
      <Faq />
      <Cta />
    </div>
  );
}
