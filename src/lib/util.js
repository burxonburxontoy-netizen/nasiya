import { useEffect, useState, useRef } from "react";

export const PLANS = {
  free: { name: "Bepul", price: 0, limit: 30 },
  pro: { name: "Pro", price: 49000, limit: 500 },
  business: { name: "Biznes", price: 99000, limit: Infinity },
};

export function money(n, suffix = true) {
  const v = Math.round(Number(n) || 0);
  const s = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return (v < 0 ? "−" : "") + s + (suffix ? " so'm" : "");
}

export const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
export const MONTHS_FULL = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
export function date(d, withTime = false) {
  if (!d) return "—";
  const x = new Date(d);
  const s = `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
  return withTime ? `${s}, ${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}` : s;
}
export function ago(d) {
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "hozirgina";
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} kun oldin`;
  return date(d);
}
export const initials = (name = "") =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export function parseAmount(s) {
  return Number(String(s).replace(/[^\d]/g, "")) || 0;
}
export function formatInput(s) {
  const n = parseAmount(s);
  return n ? n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "";
}

const HUES = [14, 32, 152, 200, 262, 330, 88];
export function avatarColor(name = "") {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${HUES[h % HUES.length]} 70% 88%)`;
}

// ---------- HASH ROUTER ----------
export function useRoute() {
  const get = () => (location.hash.replace(/^#/, "") || "/").split("?")[0];
  const [path, setPath] = useState(get);
  useEffect(() => {
    const on = () => { setPath(get()); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path;
}
export const go = (p) => { location.hash = p; };

// ---------- ANIMATION HELPERS ----------
export function useInView(opts = { threshold: 0.15 }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, opts);
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}

export function useCountUp(target, run = true, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf, start;
    const from = 0;
    const step = (t) => {
      start ??= t;
      const p = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - p, 4);
      setV(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return v;
}

export function useScrollProgress(ref) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        setP(Math.max(0, Math.min(1, -r.top / (total || 1))));
      });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, []);
  return p;
}

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const seg = (p, a, b) => clamp01((p - a) / (b - a));
export const ease = (t) => 1 - Math.pow(1 - t, 3);
