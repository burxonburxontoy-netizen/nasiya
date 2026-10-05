import { createSupa } from "./supa.js";
import { createLocal } from "./local.js";

const cfg = (typeof window !== "undefined" && window.NASIYA_CONFIG) || {};
export const botName = (cfg.telegramBot || "").replace(/^@/, "");
export const botLink = (token) => (botName ? `https://t.me/${botName}?start=${token}` : null);
export const hasSupabase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
const MODE_KEY = "nasiya.mode";

let local = null;
let supa = hasSupabase ? createSupa(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
const getLocal = () => (local ||= createLocal());

function initialMode() {
  if (!hasSupabase) return "demo";
  try { return localStorage.getItem(MODE_KEY) || "supabase"; } catch { return "supabase"; }
}
let mode = initialMode();
export const db = () => (mode === "demo" ? getLocal() : supa);
export const isDemo = () => mode === "demo";
function setMode(m) {
  mode = m;
  try { localStorage.setItem(MODE_KEY, m); } catch {}
}

// ---------- AUTH ----------
export async function restore() { return db().restore(); }
export async function signIn(data) { setMode(hasSupabase ? "supabase" : "demo"); return db().signIn(data); }
export async function signUp(data) { setMode(hasSupabase ? "supabase" : "demo"); return db().signUp(data); }
export async function demoLogin(role = "owner") { setMode("demo"); return getLocal().signIn({ role }); }
export async function signOut() { await db().signOut(); if (hasSupabase) setMode("supabase"); }
export const userEmail = () => db().getEmail();
export const resetDemo = () => getLocal().resetDemo();

// ---------- SHOP ----------
export async function myShop() {
  const id = db().getUserId();
  const rows = await db().select("shops", { id });
  return rows[0] || null;
}
export const updateShop = (id, patch) => db().update("shops", id, patch);

// ---------- CUSTOMERS + BALANCES ----------
export function balanceOf(txs) {
  return txs.reduce((a, t) => a + (t.type === "debt" ? +t.amount : -t.amount), 0);
}

export async function loadShopData() {
  const shop_id = db().getUserId();
  const [customers, transactions] = await Promise.all([
    db().select("customers", { shop_id }),
    db().select("transactions", { shop_id }),
  ]);
  const byCustomer = {};
  for (const t of transactions) (byCustomer[t.customer_id] ||= []).push(t);
  const list = customers.map((c) => {
    const txs = byCustomer[c.id] || [];
    const last = txs[0]?.created_at || c.created_at;
    const overdue = txs.some((t) => t.type === "debt" && t.due_date && new Date(t.due_date) < new Date()) && balanceOf(txs) > 0;
    return { ...c, balance: balanceOf(txs), txCount: txs.length, lastActivity: last, overdue };
  });
  return { customers: list, transactions };
}

export const addCustomer = (row) => db().insert("customers", row);
export const updateCustomer = (id, patch) => db().update("customers", id, patch);
export const deleteCustomer = (id) => db().remove("customers", id);
export const customerTx = (customer_id) => db().select("transactions", { customer_id });
export const addTx = (row) => db().insert("transactions", row);
export const deleteTx = (id) => db().remove("transactions", id);

export async function getCustomer(id) {
  const rows = await db().select("customers", { id });
  return rows[0] || null;
}

// ---------- PUBLIC ----------
export async function publicCustomer(token) {
  // Avval demo bazadan qidiramiz, keyin Supabase'dan
  const tryDemo = await getLocal().rpc("get_public_customer", { p_token: token }).catch(() => null);
  if (tryDemo) return tryDemo;
  if (supa) return supa.rpc("get_public_customer", { p_token: token }, true);
  return null;
}

// ---------- ADMIN ----------
export async function adminData() {
  const [shops, customers, transactions] = await Promise.all([
    db().select("shops"), db().select("customers"), db().select("transactions"),
  ]);
  const stat = {};
  for (const s of shops) stat[s.id] = { customers: 0, debt: 0, txCount: 0 };
  for (const c of customers) stat[c.shop_id] && stat[c.shop_id].customers++;
  for (const t of transactions) {
    if (!stat[t.shop_id]) continue;
    stat[t.shop_id].txCount++;
    stat[t.shop_id].debt += t.type === "debt" ? +t.amount : -t.amount;
  }
  return { shops: shops.map((s) => ({ ...s, ...stat[s.id] })), customers, transactions };
}

// ---------- TELEGRAM ----------
export const canUseBot = () => !isDemo() && !!botName;
export async function notify(customer_id, kind = "reminder", text) {
  if (!canUseBot()) throw new Error("Bot faqat haqiqiy rejimda ishlaydi");
  const token = await supa.getToken();
  const r = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ customer_id, kind, text }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Yuborib bo'lmadi");
  return d;
}
export async function confirmPublic(token) {
  const local = await getLocal().rpc("get_public_customer", { p_token: token }).catch(() => null);
  if (local) return getLocal().rpc("confirm_customer_tx", { p_token: token });
  return supa.rpc("confirm_customer_tx", { p_token: token }, true);
}
