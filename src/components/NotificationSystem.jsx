import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION CONTEXT
   ═══════════════════════════════════════════════════════════ */
const NotifCtx = createContext(null);

export function useNotify() {
  const ctx = useContext(NotifCtx);
  if (!ctx) return () => {};
  return ctx.notify;
}

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const ICONS = {
  success : "✅",
  error   : "❌",
  warning : "⚠️",
  info    : "ℹ️",
  coin    : "💎",
  trophy  : "🏆",
  live    : "🔴",
  kick    : "🚫",
  chat    : "💬",
  gift    : "🎁",
  medal   : "🏅",
  news    : "📢",
};

const COLORS = {
  success : { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)",  text: "#22c55e" },
  error   : { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  text: "#ef4444" },
  warning : { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.4)",  text: "#eab308" },
  info    : { bg: "rgba(139,61,255,0.12)", border: "rgba(139,61,255,0.4)", text: "#8b3dff" },
  coin    : { bg: "rgba(250,204,21,0.12)", border: "rgba(250,204,21,0.4)", text: "#facc15" },
  trophy  : { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.4)", text: "#fb923c" },
  live    : { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  text: "#ef4444" },
  kick    : { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.4)",  text: "#ef4444" },
  chat    : { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.4)", text: "#818cf8" },
  gift    : { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.4)",  text: "#22c55e" },
  medal   : { bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.4)", text: "#fb923c" },
  news    : { bg: "rgba(139,61,255,0.12)", border: "rgba(139,61,255,0.4)", text: "#8b3dff" },
};

/* ═══════════════════════════════════════════════════════════
   SINGLE TOAST ITEM
   ═══════════════════════════════════════════════════════════ */
function ToastItem({ notif, onRemove }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const color = COLORS[notif.type] || COLORS.info;
  const icon  = ICONS[notif.type]  || "🔔";

  useEffect(() => {
    // Enter
    const t1 = setTimeout(() => setVisible(true), 10);
    // Leave
    const t2 = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(notif.id), 400);
    }, notif.duration || 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div
      onClick={() => { setLeaving(true); setTimeout(() => onRemove(notif.id), 400); }}
      style={{
        display        : "flex",
        alignItems     : "flex-start",
        gap            : "12px",
        padding        : "14px 16px",
        background     : color.bg,
        border         : `1px solid ${color.border}`,
        borderRadius   : "14px",
        backdropFilter : "blur(16px)",
        boxShadow      : `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${color.border}`,
        cursor         : "pointer",
        maxWidth       : "360px",
        width          : "100%",
        transform      : visible && !leaving ? "translateX(0) scale(1)"   : "translateX(110%) scale(0.9)",
        opacity        : visible && !leaving ? 1 : 0,
        transition     : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
        willChange     : "transform, opacity",
        userSelect     : "none",
      }}
    >
      {/* Icon */}
      <span style={{ fontSize: "22px", flexShrink: 0, lineHeight: 1, marginTop: "1px" }}>{icon}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {notif.title && (
          <div style={{
            fontFamily   : "'JetBrains Mono', monospace",
            fontSize     : "11px",
            fontWeight   : 700,
            letterSpacing: "1.5px",
            color        : color.text,
            marginBottom : "3px",
            textTransform: "uppercase",
          }}>
            {notif.title}
          </div>
        )}
        {notif.message && (
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize  : "13px",
            color     : "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
            wordBreak : "break-word",
          }}>
            {notif.message}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{
        position    : "absolute",
        bottom      : 0,
        left        : 0,
        height      : "2px",
        background  : color.text,
        borderRadius: "0 0 14px 14px",
        animation   : `cp-notif-shrink ${(notif.duration || 4000)}ms linear forwards`,
        opacity     : 0.6,
        width       : "100%",
      }}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROVIDER
   ═══════════════════════════════════════════════════════════ */
export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const userRef = useRef(null);

  const notify = useCallback((type = "info", title = "", message = "", duration = 4000) => {
    const id = Date.now() + Math.random();
    setNotifs(prev => [...prev.slice(-4), { id, type, title, message, duration }]);
  }, []);

  const remove = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  /* ── Realtime subscriptions ── */
  useEffect(() => {
    let walletSub, tournamentSub, matchSub, roomSub, newsSub, achieveSub, supportSub;

    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) return;
      const uid = data.user.id;
      userRef.current = uid;

      // 💎 Wallet changes
      walletSub = supabase
        .channel("notif-wallet")
        .on("postgres_changes", {
          event : "UPDATE",
          schema: "public",
          table : "wallets",
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          const diff = (payload.new.balance || 0) - (payload.old.balance || 0);
          if (diff > 0) notify("coin",    `+${diff} pièces reçues`, "Votre solde a été crédité 💰");
          else if (diff < 0) notify("info", `${diff} pièces`, "Pièces dépensées");
        })
        .subscribe();

      // 🔴 Match results validated
      matchSub = supabase
        .channel("notif-results")
        .on("postgres_changes", {
          event : "UPDATE",
          schema: "public",
          table : "match_results",
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          if (payload.new.status === "verified")
            notify("trophy", "Résultat validé ✅", "L'admin a approuvé votre résultat");
          else if (payload.new.status === "rejected")
            notify("error",  "Résultat rejeté ❌", "L'admin a refusé votre résultat");
        })
        .subscribe();

      // 🏆 New tournaments
      tournamentSub = supabase
        .channel("notif-tournaments")
        .on("postgres_changes", {
          event : "INSERT",
          schema: "public",
          table : "tournaments",
        }, (payload) => {
          notify("trophy", "Nouveau tournoi 🏆", payload.new.title || "Un tournoi vient d'être créé");
        })
        .subscribe();

      // 🔴 Room status changes (match start)
      roomSub = supabase
        .channel("notif-rooms")
        .on("postgres_changes", {
          event : "UPDATE",
          schema: "public",
          table : "tournaments",
        }, (payload) => {
          if (payload.new.room_status === "live" && payload.old.room_status !== "live")
            notify("live", "Match en cours 🔴", payload.new.title || "Le match a commencé !");
          if (payload.new.room_status === "results_open" && payload.old.room_status === "live")
            notify("info", "Soumettez votre résultat 📊", "Le match est terminé");
        })
        .subscribe();

      // 📢 Admin news / announcements
      newsSub = supabase
        .channel("notif-news")
        .on("postgres_changes", {
          event : "INSERT",
          schema: "public",
          table : "news",
        }, (payload) => {
          notify("news", payload.new.title || "Nouvelle annonce 📢", payload.new.excerpt || "");
        })
        .subscribe();

      // 🏅 Achievements
      achieveSub = supabase
        .channel("notif-achievements")
        .on("postgres_changes", {
          event : "INSERT",
          schema: "public",
          table : "user_achievements",
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          notify("medal", "Achievement débloqué 🏅", payload.new.achievement_name || "Félicitations !");
        })
        .subscribe();

      // 💬 Support reply
      supportSub = supabase
        .channel("notif-support")
        .on("postgres_changes", {
          event : "INSERT",
          schema: "public",
          table : "support_messages",
          filter: `user_id=eq.${uid}`,
        }, (payload) => {
          if (payload.new.sender_role === "admin")
            notify("chat", "Support a répondu 💬", payload.new.message?.slice(0, 60) || "");
        })
        .subscribe();
    });

    return () => {
      walletSub?.unsubscribe();
      matchSub?.unsubscribe();
      tournamentSub?.unsubscribe();
      roomSub?.unsubscribe();
      newsSub?.unsubscribe();
      achieveSub?.unsubscribe();
      supportSub?.unsubscribe();
    };
  }, [notify]);

  return (
    <NotifCtx.Provider value={{ notify }}>
      {children}

      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes cp-notif-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {/* ── Toast container ── */}
      <div style={{
        position      : "fixed",
        top           : "76px",
        right         : "16px",
        zIndex        : 9999,
        display       : "flex",
        flexDirection : "column",
        gap           : "10px",
        pointerEvents : "none",
      }}>
        {notifs.map(n => (
          <div key={n.id} style={{ pointerEvents: "auto" }}>
            <ToastItem notif={n} onRemove={remove} />
          </div>
        ))}
      </div>
    </NotifCtx.Provider>
  );
}