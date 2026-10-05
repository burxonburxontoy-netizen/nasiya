// Supabase uchun yengil klient (Auth + PostgREST), qo'shimcha kutubxonasiz.
const SESSION_KEY = "nasiya.session";

export function createSupa(url, key) {
  url = url.replace(/\/$/, "");
  let session = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
  }
  function save(s) {
    session = s;
    try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch {}
  }

  async function authReq(path, body) {
    const r = await fetch(`${url}/auth/v1/${path}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(translateErr(data.error_description || data.msg || data.message || "Xatolik"));
    return data;
  }

  function toSession(d) {
    if (!d || !d.access_token) return null;
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
      user: d.user,
    };
  }

  async function ensureFresh() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session;
    try {
      const d = await authReq("token?grant_type=refresh_token", { refresh_token: session.refresh_token });
      save(toSession(d));
    } catch { save(null); }
    return session;
  }

  async function rest(path, { method = "GET", body, prefer, anon } = {}) {
    const s = anon ? null : await ensureFresh();
    const headers = { apikey: key, "Content-Type": "application/json" };
    // Yangi "sb_publishable_" kalitlar JWT emas — faqat sessiya bo'lsa Bearer yuboramiz
    if (s) headers.Authorization = `Bearer ${s.access_token}`;
    else if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
    if (prefer) headers.Prefer = prefer;
    const r = await fetch(`${url}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error((data && (data.message || data.hint)) || `Server xatosi (${r.status})`);
    return data;
  }

  const q = (filters = {}) =>
    Object.entries(filters).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join("&");

  return {
    mode: "supabase",
    getUserId: () => session?.user?.id || null,
    getEmail: () => session?.user?.email || null,
    async getToken() { return (await ensureFresh())?.access_token || null; },
    async restore() { return !!(await ensureFresh()); },

    async signUp({ email, password, shop_name, owner_name, phone }) {
      const d = await authReq("signup", { email, password, data: { shop_name, owner_name, phone } });
      const s = toSession(d);
      if (!s) return { needsConfirm: true };
      save(s);
      return { ok: true };
    },
    async signIn({ email, password }) {
      const d = await authReq("token?grant_type=password", { email, password });
      save(toSession(d));
      return { ok: true };
    },
    async signOut() {
      try {
        if (session) await fetch(`${url}/auth/v1/logout`, {
          method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}` },
        });
      } catch {}
      save(null);
    },

    select: (table, filters, order = "created_at.desc") =>
      rest(`${table}?select=*&${q(filters)}&order=${order}`),
    insert: async (table, row) => (await rest(table, { method: "POST", body: row, prefer: "return=representation" }))[0],
    update: async (table, id, patch) =>
      (await rest(`${table}?id=eq.${id}`, { method: "PATCH", body: patch, prefer: "return=representation" }))[0],
    remove: (table, id) => rest(`${table}?id=eq.${id}`, { method: "DELETE" }),
    rpc: (fn, args, anon) => rest(`rpc/${fn}`, { method: "POST", body: args, anon }),
  };
}

function translateErr(m) {
  const map = {
    "Invalid login credentials": "Email yoki parol noto'g'ri",
    "User already registered": "Bu email bilan allaqachon ro'yxatdan o'tilgan",
    "Email not confirmed": "Email hali tasdiqlanmagan — pochtangizni tekshiring",
    "Password should be at least 6 characters.": "Parol kamida 6 belgidan iborat bo'lsin",
  };
  return map[m] || m;
}
