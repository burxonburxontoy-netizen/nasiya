// DEMO rejimi: Supabase bilan bir xil interfeys, ma'lumotlar brauzerda saqlanadi.
const DB_KEY = "nasiya.demo.db.v2";
const SESSION_KEY = "nasiya.demo.session";

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const token = () => Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);

function rng(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Ali", "Vali", "Dilnoza", "Sardor", "Gulnora", "Jasur", "Malika", "Bekzod", "Nodira", "Rustam",
  "Shahnoza", "Otabek", "Zarina", "Farrux", "Madina", "Akmal", "Sevara", "Bobur", "Kamola", "Sherzod"];
const SUFFIX = ["aka", "opa", "", "", "aka", "opa"];
const GOODS = ["Non, yog'", "Un 10 kg", "Shakar, choy", "Guruch 5 kg", "Sut mahsulotlari", "Go'sht 2 kg",
  "Kir yuvish kukuni", "Sabzavotlar", "Tuxum 30 dona", "Makaron, yog'", "Ichimliklar", "Shirinliklar"];

function seed() {
  const r = rng(42);
  const now = Date.now();
  const DAY = 864e5;
  const shops = [
    { id: "demo-shop", name: "Baraka market", owner_name: "Jahongir Karimov", phone: "+998 90 123 45 67",
      address: "Toshkent, Chilonzor 9-kvartal", plan: "pro", is_active: true, is_admin: false },
    { id: "demo-admin", name: "Nasiya HQ", owner_name: "Admin", phone: "+998 97 000 00 00",
      address: "Toshkent", plan: "business", is_active: true, is_admin: true },
    { id: "s3", name: "Oila do'koni", owner_name: "Rustam Aliyev", phone: "+998 93 555 11 22", address: "Samarqand", plan: "free", is_active: true },
    { id: "s4", name: "Mahalla savdo", owner_name: "Nilufar Usmonova", phone: "+998 91 777 33 44", address: "Andijon", plan: "pro", is_active: true },
    { id: "s5", name: "Fresh Mini", owner_name: "Doston Rahimov", phone: "+998 99 888 22 11", address: "Namangan", plan: "business", is_active: true },
    { id: "s6", name: "Halol oziq-ovqat", owner_name: "Sanjar Qodirov", phone: "+998 94 321 65 87", address: "Buxoro", plan: "free", is_active: false },
    { id: "s7", name: "Do'stlik market", owner_name: "Feruza Ergasheva", phone: "+998 95 234 56 78", address: "Farg'ona", plan: "free", is_active: true },
  ].map((s, i) => ({ is_admin: false, ...s, created_at: new Date(now - (200 - i * 25) * DAY).toISOString() }));

  const customers = [];
  const transactions = [];
  const counts = { "demo-shop": 16, s3: 7, s4: 12, s5: 22, s6: 4, s7: 9 };
  for (const [shop_id, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      const f = FIRST[Math.floor(r() * FIRST.length)];
      const name = `${f} ${SUFFIX[Math.floor(r() * SUFFIX.length)]}`.trim();
      const c = {
        id: uid(), shop_id, name,
        phone: `+998 9${Math.floor(r() * 9)} ${100 + Math.floor(r() * 899)} ${10 + Math.floor(r() * 89)} ${10 + Math.floor(r() * 89)}`,
        note: r() > 0.7 ? "Doimiy mijoz" : "", credit_limit: r() > 0.5 ? 500000 : 0,
        public_token: token(), created_at: new Date(now - (150 - i * 5) * DAY).toISOString(),
        telegram_chat_id: r() > 0.45 ? 100000 + i : null,
      };
      customers.push(c);
      const txn = 3 + Math.floor(r() * 8);
      let bal = 0;
      for (let k = 0; k < txn; k++) {
        const daysAgo = Math.floor(Math.pow(r(), 1.7) * 170);
        const isPay = bal > 0 && r() > 0.55;
        const amount = isPay
          ? Math.min(bal, Math.round((20 + r() * 200) / 5) * 5000)
          : Math.round((3 + r() * 60)) * 5000;
        if (amount <= 0) continue;
        bal += isPay ? -amount : amount;
        transactions.push({
          id: uid(), shop_id, customer_id: c.id, type: isPay ? "payment" : "debt", amount,
          note: isPay ? "Naqd to'lov" : GOODS[Math.floor(r() * GOODS.length)],
          due_date: !isPay && r() > 0.5 ? new Date(now + (Math.floor(r() * 30) - 8) * DAY).toISOString().slice(0, 10) : null,
          created_at: new Date(now - daysAgo * DAY - Math.floor(r() * DAY)).toISOString(),
          confirmed_at: daysAgo > 6 && r() > 0.3 ? new Date(now - (daysAgo - 1) * DAY).toISOString() : null,
        });
      }
    }
  }
  return { shops, customers, transactions };
}

export function createLocal() {
  let db;
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch {}
  if (!db) { db = seed(); persist(); }
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch {}

  function persist() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch {} }
  function setSession(s) {
    session = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {}
  }
  const me = () => db.shops.find((s) => s.id === session?.id);
  const isAdmin = () => !!me()?.is_admin;
  const wait = (v) => new Promise((res) => setTimeout(() => res(v), 120));

  function visible(table) {
    const rows = db[table];
    if (isAdmin()) return rows;
    if (table === "shops") return rows.filter((s) => s.id === session?.id);
    return rows.filter((x) => x.shop_id === session?.id);
  }

  return {
    mode: "demo",
    getUserId: () => session?.id || null,
    getEmail: () => session?.email || null,
    async restore() { return !!session; },
    async signUp({ email, shop_name, owner_name, phone }) {
      const id = uid();
      db.shops.push({ id, name: shop_name || "Mening do'konim", owner_name, phone, address: "", plan: "free",
        is_active: true, is_admin: false, created_at: new Date().toISOString() });
      persist();
      setSession({ id, email });
      return wait({ ok: true });
    },
    async signIn({ email, role }) {
      const id = role === "admin" ? "demo-admin" : "demo-shop";
      setSession({ id, email: email || (role === "admin" ? "admin@nasiya.uz" : "demo@nasiya.uz") });
      return wait({ ok: true });
    },
    async signOut() { setSession(null); },
    resetDemo() { db = seed(); persist(); },

    async select(table, filters = {}) {
      let rows = visible(table).filter((r) => Object.entries(filters).every(([k, v]) => String(r[k]) === String(v)));
      rows = [...rows].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
      return wait(structuredClone(rows));
    },
    async insert(table, row) {
      const full = { id: uid(), shop_id: session?.id, created_at: new Date().toISOString(), ...row };
      if (table === "customers") full.public_token = full.public_token || token();
      db[table].push(full); persist();
      return wait(structuredClone(full));
    },
    async update(table, id, patch) {
      const row = visible(table).find((r) => r.id === id);
      if (!row) throw new Error("Topilmadi");
      if (table === "shops" && !isAdmin()) { delete patch.plan; delete patch.is_admin; delete patch.is_active; }
      Object.assign(row, patch); persist();
      return wait(structuredClone(row));
    },
    async remove(table, id) {
      const row = visible(table).find((r) => r.id === id);
      if (!row) return;
      db[table] = db[table].filter((r) => r.id !== id);
      if (table === "customers") db.transactions = db.transactions.filter((t) => t.customer_id !== id);
      persist();
      return wait(null);
    },
    async rpc(fn, args) {
      if (fn === "confirm_customer_tx") {
        const c = db.customers.find((x) => x.public_token === args.p_token);
        if (!c) return wait(0);
        let n = 0;
        for (const t of db.transactions) if (t.customer_id === c.id && !t.confirmed_at) { t.confirmed_at = new Date().toISOString(); n++; }
        persist();
        return wait(n);
      }
      if (fn !== "get_public_customer") throw new Error("Noma'lum funksiya");
      const c = db.customers.find((x) => x.public_token === args.p_token);
      if (!c) return wait(null);
      const s = db.shops.find((x) => x.id === c.shop_id) || {};
      const txs = db.transactions.filter((t) => t.customer_id === c.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return wait({
        name: c.name, shop_name: s.name, shop_phone: s.phone, shop_address: s.address, telegram: !!c.telegram_chat_id,
        balance: txs.reduce((a, t) => a + (t.type === "debt" ? t.amount : -t.amount), 0),
        transactions: txs.map(({ type, amount, note, due_date, created_at, confirmed_at }) => ({ type, amount, note, due_date, created_at, confirmed_at })),
      });
    },
  };
}
