import { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { ToastProvider, Spinner } from "./components/ui.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Admin from "./pages/Admin.jsx";
import PublicCustomer from "./pages/PublicCustomer.jsx";
import * as api from "./lib/api.js";
import { useRoute, go } from "./lib/util.js";

function App() {
  const path = useRoute();
  const [shop, setShop] = useState(undefined); // undefined = loading, null = signed out

  const loadShop = useCallback(async () => {
    try {
      const ok = await api.restore();
      setShop(ok ? await api.myShop() : null);
    } catch { setShop(null); }
  }, []);

  useEffect(() => { loadShop(); }, [path.startsWith("/app") || path.startsWith("/admin")]);
  useEffect(() => { if (!path.startsWith("/app")) window.scrollTo(0, 0); }, [path]);

  if (path.startsWith("/c/")) return <PublicCustomer token={path.slice(3)} />;
  if (path === "/login" || path === "/register") return <Auth mode={path.slice(1)} onAuthed={loadShop} />;

  if (path.startsWith("/app") || path.startsWith("/admin")) {
    if (shop === undefined) return <div className="center-page"><Spinner size={32} /></div>;
    if (!shop) { go("/login"); return null; }
    if (!shop.is_active && !shop.is_admin) {
      return <div className="center-page"><div className="empty"><h4>Hisob vaqtincha to'xtatilgan</h4><p>Administrator bilan bog'laning.</p>
        <button className="btn btn--outline btn--md" onClick={async () => { await api.signOut(); go("/"); }}>Chiqish</button></div></div>;
    }
    if (path.startsWith("/admin")) return <Admin shop={shop} />;
    return <Dashboard path={path} shop={shop} reloadShop={loadShop} />;
  }
  return <Landing />;
}

createRoot(document.getElementById("root")).render(<ToastProvider><App /></ToastProvider>);
